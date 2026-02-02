#!/usr/bin/env python3
"""
IPO Application Automation Script
Uses Playwright to automate IPO applications based on CSV data
Supports MeroShare portal with Ordinary IPO applications
"""

import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path

# Configure logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / "ipo-application.log"

# Setup logging to both file and console
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ================= PLAYWRIGHT =================
try:
    from playwright.async_api import async_playwright
except ImportError:
    logger.error("Playwright not installed. Run: pip install playwright")
    sys.exit(1)

# ================= FUZZY MATCHING =================
try:
    from difflib import SequenceMatcher
except ImportError:
    logger.error("difflib not available")
    sys.exit(1)


def fuzzy_match_bank(user_bank: str, available_banks: list, threshold: float = 0.80) -> tuple[str | None, float]:
    """
    Fuzzy match user-provided bank name with available options.
    Returns (matched_bank, confidence_score) or (None, 0) if no match above threshold.
    """
    if not user_bank or not user_bank.strip():
        return None, 0
    
    user_bank_lower = user_bank.lower().strip()
    best_match = None
    best_score = 0
    
    for bank in available_banks:
        bank_lower = bank.lower().strip()
        # Calculate similarity score
        score = SequenceMatcher(None, user_bank_lower, bank_lower).ratio()
        
        if score > best_score:
            best_score = score
            best_match = bank
    
    if best_score >= threshold:
        return best_match, best_score
    
    return None, best_score


# ================= LOGOUT =================
async def handle_logout(page):
    """Handle logout from the IPO portal"""
    try:
        logger.info("Logging out...")
        selector = "li.header-menu__item--logout-desktop-view a.nav-link"
        await page.wait_for_selector(selector, timeout=5000)
        await page.click(selector)
        await page.wait_for_url("**/#/login", timeout=10000)
        logger.info("Logout successful")
        return True
    except Exception as e:
        logger.warning(f"Logout skipped or failed: {e}")
        return False


# ================= DP SELECTION =================
async def select_login_dp(page, dp_code):
    """Select Depository Participant (DP) using Select2 dropdown"""
    try:
        await page.click("span.select2-selection--single")
        await page.wait_for_timeout(500)

        search = page.locator("input.select2-search__field")
        await search.fill(str(dp_code))
        await page.wait_for_timeout(1000)

        option = page.locator(
            f"li.select2-results__option:has-text('({dp_code})')"
        )

        if await option.is_visible():
            await option.click()
            logger.info("DP selected")
            return True

        logger.error("DP not found")
        return False

    except Exception as e:
        logger.error(f"DP selection error: {e}")
        return False


# ================= ACCOUNT PROCESSOR =================
async def process_account(browser, account):
    """Process a single account through the IPO application workflow"""
    context = None
    try:
        context = await browser.new_context(
            ignore_https_errors=True,
            viewport={"width": 1280, "height": 800}
        )
        page = await context.new_page()

        logger.info(f"===== PROCESSING: {account['username']} =====")

        # ---------- LOGIN ----------
        await page.goto(
            "https://meroshare.cdsc.com.np/",
            wait_until="networkidle",
            timeout=60000
        )

        if not await select_login_dp(page, account["dp"]):
            return False

        await page.fill("#username", str(account["username"]))
        await page.fill("#password", str(account["password"]))
        await page.click("button[type='submit']")

        await page.wait_for_selector(".navbar", timeout=20000)
        logger.info("Login successful")

        # ---------- ASBA ----------
        await page.goto(
            "https://meroshare.cdsc.com.np/#/asba",
            wait_until="networkidle"
        )

        await page.wait_for_selector(".company-list", timeout=20000)
        await page.wait_for_function(
            "() => document.querySelectorAll('.company-list span.isin').length > 0"
        )

        rows = page.locator(".company-list")
        total = await rows.count()
        ipo_row = None

        for i in range(total):
            row = rows.nth(i)
            isin_text = (await row.locator("span.isin").inner_text()).strip().lower()
            share_type = (await row.locator("span.share-of-type").inner_text()).strip().lower()

            if "ordinary" in isin_text and "ipo" in share_type:
                ipo_row = row
                break

        if not ipo_row:
            logger.warning("No active Ordinary IPO found")
            await handle_logout(page)
            return False

        logger.info("Ordinary IPO located")

        # ---------- APPLY / EDIT ----------
        apply_btn = ipo_row.locator("button.btn-issue i").filter(has_text="Apply").locator("..")
        edit_btn = ipo_row.locator("button.btn-issue i").filter(has_text="Edit").locator("..")

        if await apply_btn.is_visible():
            await apply_btn.click()
            logger.info("Apply clicked")
        elif await edit_btn.is_visible():
            logger.info("Already applied")
            await handle_logout(page)
            return True
        else:
            logger.info("Record Already verified")
            await handle_logout(page)
            return False

        # ---------- FORM STEP 1 ----------
        await page.wait_for_selector("#selectBank", state="visible")
        
        # FIX: Wait for the dropdown options to be populated by Angular 
        # (Looking for at least 2 options: the placeholder + 1 bank)
        await page.wait_for_function(
            "() => document.querySelectorAll('#selectBank option').length > 1",
            timeout=10000
        )
        
        # Get available bank options from the dropdown
        bank_options = await page.query_selector_all("#selectBank option")
        available_banks = []
        
        for option in bank_options:
            text = await option.text_content()
            value = await option.get_attribute("value")
            if text and value and value.strip():  # Skip empty/placeholder options
                available_banks.append((text.strip(), value.strip()))
        
        logger.info(f"Available banks: {[b[0] for b in available_banks]}")
        
        # Try to match user-provided bank with available options
        user_bank = account.get("bank", "").strip()
        selected = False
        
        if user_bank:
            # Extract just the bank names for fuzzy matching
            bank_names = [b[0] for b in available_banks]
            # Lowered threshold to 0.8 for better matching with "LTD." variations
            matched_bank, score = fuzzy_match_bank(user_bank, bank_names, threshold=0.80)
            
            if matched_bank:
                # Find the corresponding value for this bank
                matched_value = next((b[1] for b in available_banks if b[0] == matched_bank), None)
                if matched_value:
                    logger.info(f"Bank fuzzy matched: {user_bank} -> {matched_bank} (confidence: {score:.2%})")
                    await page.select_option("#selectBank", matched_value)
                    selected = True
            else:
                logger.warning(f"Bank fuzzy match failed: {user_bank} (best score: {score:.2%})")
        
        # Fallback to first available bank if no match or no bank specified
        if not selected:
            if len(available_banks) > 0:
                logger.info(f"Using first available bank: {available_banks[0][0]}")
                await page.select_option("#selectBank", available_banks[0][1])
            else:
                logger.warning("No available banks found")
                raise Exception("No bank options available in dropdown")

        # FIX: Wait for the account number dropdown to populate after bank is selected
        await page.wait_for_selector(
            "#accountNumber option:not([value=''])",
            state="attached",
            timeout=5000
        )
        await page.select_option("#accountNumber", index=1)

        await page.fill("#appliedKitta", str(account["units"]))
        await page.keyboard.press("Tab")
        await page.fill("#crnNumber", str(account["crn"]))
        await page.check("#disclaimer", force=True)

        await page.click("button[type='submit']:has-text('Proceed')")

        # ---------- FORM STEP 2 ----------
        await page.wait_for_selector("#transactionPIN", state="visible")
        await page.fill("#transactionPIN", str(account["pin"]))
        await page.click("button[type='submit']:has-text('Apply')")

        # ---------- TOAST VERIFICATION ----------
        toast = page.locator("#toast-container .toast-message")
        try:
            await toast.wait_for(state="visible", timeout=8000)
            message = await toast.inner_text()
            is_success = await page.locator(".toast-success").is_visible()

            if is_success:
                logger.info(f"SUCCESS: {message}")
            else:
                logger.error(f"FAILED: {message}")
        except Exception:
            logger.warning("No toast message detected")

        await page.wait_for_timeout(1000)
        await handle_logout(page)
        return True

    except Exception as e:
        logger.error(f"CRITICAL ERROR for {account.get('username')}: {e}")
        return False

    finally:
        if context:
            await context.close()


# ================= MAIN =================
async def main():
    """Main entry point"""
    try:
        # Get CSV data from environment
        csv_json_str = os.environ.get("ACCOUNTS_JSON", "[]")
        apply_id = os.environ.get("APPLY_ID", "unknown")

        logger.info("=" * 80)
        logger.info("IPO AUTOMATION STARTED")
        logger.info("=" * 80)
        logger.info(f"Apply ID: {apply_id}")
        logger.info(f"Started at: {datetime.now().isoformat()}")

        # Parse accounts data
        try:
            accounts = json.loads(csv_json_str)
        except json.JSONDecodeError:
            logger.error("Failed to parse ACCOUNTS_JSON environment variable")
            return

        if not accounts:
            logger.error("No accounts data provided")
            return

        logger.info(f"Loaded {len(accounts)} accounts from environment")

        # Initialize Playwright
        async with async_playwright() as p:
            logger.info("Launching browser...")
            browser = await p.chromium.launch(headless=True)

            successful = 0
            failed = 0

            for i, account in enumerate(accounts, 1):
                logger.info(f"\n--- Account {i}/{len(accounts)} ---")
                if await process_account(browser, account):
                    successful += 1
                else:
                    failed += 1

                # Add delay between accounts to avoid rate limiting
                if i < len(accounts):
                    await asyncio.sleep(2)

            await browser.close()
            logger.info("Browser closed")

            logger.info("\n" + "=" * 80)
            logger.info("IPO AUTOMATION COMPLETED")
            logger.info("=" * 80)
            logger.info(f"Total accounts: {len(accounts)}")
            logger.info(f"Successful: {successful}")
            logger.info(f"Failed: {failed}")
            logger.info(f"Completed at: {datetime.now().isoformat()}")
            logger.info("=" * 80)

    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
