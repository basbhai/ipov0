#!/usr/bin/env python3
import asyncio
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from difflib import SequenceMatcher

# Setup logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler(log_dir / "ipo-application.log"), logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)

try:
    from playwright.async_api import async_playwright
except ImportError:
    logger.error("Playwright not installed. Run: pip install playwright")
    sys.exit(1)

def fuzzy_match_bank(user_bank: str, available_banks: list, threshold: float = 0.8) -> tuple[str | None, float]:
    if not user_bank or not user_bank.strip():
        return None, 0
    
    user_bank_lower = user_bank.lower().strip()
    best_match, best_score = None, 0
    
    for bank in available_banks:
        bank_lower = bank.lower().strip()
        score = SequenceMatcher(None, user_bank_lower, bank_lower).ratio()
        if score > best_score:
            best_score, best_match = score, bank
    
    return (best_match, best_score) if best_score >= threshold else (None, best_score)

async def handle_logout(page):
    try:
        logger.info("Logging out...")
        await page.click("li.header-menu__item--logout-desktop-view a.nav-link", timeout=5000)
        await page.wait_for_url("**/#/login", timeout=10000)
        return True
    except Exception:
        return False

async def select_login_dp(page, dp_code):
    try:
        await page.click("span.select2-selection--single")
        search = page.locator("input.select2-search__field")
        await search.fill(str(dp_code))
        option = page.locator(f"li.select2-results__option:has-text('({dp_code})')")
        await option.wait_for(state="visible", timeout=5000)
        await option.click()
        return True
    except Exception as e:
        logger.error(f"DP selection error: {e}")
        return False

async def process_account(browser, account):
    context = await browser.new_context(viewport={"width": 1280, "height": 800})
    page = await context.new_page()
    
    try:
        logger.info(f"===== PROCESSING: {account['username']} =====")
        await page.goto("https://meroshare.cdsc.com.np/", wait_until="networkidle", timeout=60000)

        if not await select_login_dp(page, account["dp"]): return False

        await page.fill("#username", str(account["username"]))
        await page.fill("#password", str(account["password"]))
        await page.click("button[type='submit']")
        await page.wait_for_selector(".navbar", timeout=20000)

        # Navigate to ASBA
        await page.goto("https://meroshare.cdsc.com.np/#/asba")
        await page.wait_for_selector(".company-list", timeout=20000)

        # Locate Ordinary IPO
        rows = page.locator(".company-list")
        ipo_row = None
        for i in range(await rows.count()):
            row = rows.nth(i)
            text = (await row.inner_text()).lower()
            if "ordinary" in text and "apply" in text:
                ipo_row = row
                break

        if not ipo_row:
            logger.warning("No active IPO or already applied.")
            await handle_logout(page)
            return False

        await ipo_row.locator("button.btn-issue").click()

        # ---------- DYNAMIC BANK SELECTION ----------
        await page.wait_for_selector("#selectBank", state="visible")
        
        # CRITICAL: Wait for Angular to populate the options (more than just the placeholder)
        await page.wait_for_function(
            "() => document.querySelectorAll('#selectBank option').length > 1",
            timeout=10000
        )

        bank_options = await page.query_selector_all("#selectBank option")
        available_banks = []
        for opt in bank_options:
            val = await opt.get_attribute("value")
            txt = await opt.text_content()
            if val and val.strip():
                available_banks.append((txt.strip(), val.strip()))

        user_bank = account.get("bank", "").strip()
        matched_value = None

        if user_bank:
            names = [b[0] for b in available_banks]
            match, score = fuzzy_match_bank(user_bank, names)
            if match:
                matched_value = next(b[1] for b in available_banks if b[0] == match)
                logger.info(f"Matched Bank: {match} ({score:.2%})")

        if not matched_value and available_banks:
            matched_value = available_banks[0][1]
            logger.info(f"Fallback to first bank: {available_banks[0][0]}")

        await page.select_option("#selectBank", value=matched_value)

        # ---------- FORM FILL ----------
        # Wait for account number to populate after bank selection
        await page.wait_for_selector("#accountNumber option:not([value=''])", timeout=5000)
        await page.select_option("#accountNumber", index=1)

        await page.fill("#appliedKitta", str(account["units"]))
        await page.fill("#crnNumber", str(account["crn"]))
        await page.check("#disclaimer", force=True)
        await page.click("button[type='submit']:has-text('Proceed')")

        # PIN Step
        await page.wait_for_selector("#transactionPIN", state="visible")
        await page.fill("#transactionPIN", str(account["pin"]))
        
        # Final Apply
        await page.click("button[type='submit']:has-text('Apply')")
        
        # Verification
        toast = page.locator("#toast-container .toast-message")
        await toast.wait_for(state="visible", timeout=10000)
        logger.info(f"Result: {await toast.inner_text()}")

        await handle_logout(page)
        return True

    except Exception as e:
        logger.error(f"Error for {account.get('username')}: {str(e)}")
        return False
    finally:
        await context.close()

async def main():
    # Load accounts from Environment Variable or JSON file
    data = os.environ.get("ACCOUNTS_JSON", "[]")
    accounts = json.loads(data)

    if not accounts:
        logger.error("No accounts found in ACCOUNTS_JSON")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for acc in accounts:
            await process_account(browser, acc)
            await asyncio.sleep(2)
        await browser.close()

if __name__ == "__main__":
    async_run_main = asyncio.run(main())
