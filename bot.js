const puppeteer = require('puppeteer');

async function launchMeetingBot() {
  const meetUrl = process.env.MEET_URL;
  if (!meetUrl) {
    console.error("Error: MEET_URL environment variable is missing.");
    process.exit(1);
  }

  console.log(`[Bot] Activating Chrome Instance...`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log(`[Bot] Connecting to meeting room: ${meetUrl}`);
  await page.goto(meetUrl, { waitUntil: 'networkidle2' });

  try {
    // Disable camera and mic capture controls
    await page.keyboard.down('Control');
    await page.keyboard.press('d'); 
    await page.keyboard.press('e'); 
    await page.keyboard.up('Control');
    
    // Brief delay to allow inputs to render
    await new Promise(r => setTimeout(r, 3000));

    // Type the identity profile string
    const nameInputSelector = 'input[type="text"]';
    await page.waitForSelector(nameInputSelector, { timeout: 15000 });
    await page.type(nameInputSelector, 'Recording Bot');

    // Execute the Join sequence click
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const joinButton = buttons.find(b => 
        b.textContent.includes('Ask to join') || b.textContent.includes('Join now')
      );
      if (joinButton) joinButton.click();
    });

    console.log(`[Bot] Success. Joined target grid. Running active session...`);
    
    // Keep it alive inside the GitHub runner container for 45 minutes
    await new Promise(r => setTimeout(r, 45 * 60 * 1000));

  } catch (error) {
    console.error(`[Execution Error]:`, error.message);
  } finally {
    await browser.close();
    console.log(`[Bot] Offline. Worker container shutdown.`);
  }
}

launchMeetingBot();
