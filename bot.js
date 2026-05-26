const puppeteer = require('puppeteer');

async function launchMeetingBot() {
  let meetUrl = process.env.MEET_URL;
  if (!meetUrl) {
    console.error("Error: MEET_URL environment variable is missing.");
    process.exit(1);
  }

  // FIX: Automatically prepend protocol header if missing from manual entry
  if (!meetUrl.startsWith('http://') && !meetUrl.startsWith('https://')) {
    meetUrl = 'https://' + meetUrl;
  }

  console.log(`[Bot] Activating Headless Chrome Instance...`);
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',     // Pre-grants audio/video access
      '--use-fake-device-for-media-stream', // Feeds a placeholder visual/audio grid
      '--disable-audio-output'              // Prevents server audio processing load
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  console.log(`[Bot] Connecting to meeting room: ${meetUrl}`);
  
  try {
    await page.goto(meetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Force mute devices via native Google Meet hotkeys right away
    console.log(`[Bot] Muting microphome and camera hardware profiles...`);
    await page.keyboard.down('Control');
    await page.keyboard.press('d'); 
    await page.keyboard.press('e'); 
    await page.keyboard.up('Control');
    
    // Stabilize UI animations
    await new Promise(r => setTimeout(r, 3000));

    // Input identity profile text string
    const nameInputSelector = 'input[type="text"]';
    await page.waitForSelector(nameInputSelector, { timeout: 15000 });
    await page.type(nameInputSelector, 'Recording Bot');

    // Click entry grid action button dynamically
    console.log(`[Bot] Dispatching click event to request room entry...`);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const joinButton = buttons.find(b => 
        b.textContent.includes('Ask to join') || 
        b.textContent.includes('Join now') ||
        b.textContent.includes('Join')
      );
      if (joinButton) joinButton.click();
    });

    console.log(`[Bot] Success. Entered active room grid state.`);
    
    // Keep it alive inside the GitHub runner container for 45 minutes
    console.log(`[Bot] Session running. Monitoring stream...`);
    await new Promise(r => setTimeout(r, 45 * 60 * 1000));

  } catch (error) {
    console.error(`[Execution Error]:`, error.message);
  } finally {
    await browser.close();
    console.log(`[Bot] Offline. Worker container shutdown.`);
  }
}

launchMeetingBot();
