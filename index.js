const puppeteer = require('puppeteer');

async function runVisualBot(targetUrl) {
  // 1. Sanitize the incoming target URL structure
  let meetUrl = targetUrl;
  if (!meetUrl.startsWith('http://') && !meetUrl.startsWith('https://')) {
    meetUrl = 'https://' + meetUrl;
  }

  console.log(`[System] Initializing Chromium execution context...`);

  // 2. Launch Chromium with custom audio/video flags
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',     // Automatically accepts mic/cam permissions
      '--use-fake-device-for-media-stream', // Emulates synthetic audio/video test signals
      '--disable-audio-output'              // Prevents server-side audio loops
    ]
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport resolution to render the complete Meet dashboard grid
    await page.setViewport({ width: 1280, height: 720 });

    console.log(`[Navigation] Directing headless worker to: ${meetUrl}`);
    await page.goto(meetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // 3. Force Mute Devices via Google Meet system Hotkeys
    console.log(`[Media] Executing hotkey combinations to mute local streams...`);
    await page.keyboard.down('Control');
    await page.keyboard.press('d'); // Native shortcut to toggle microphone off
    await page.keyboard.press('e'); // Native shortcut to toggle camera off
    await page.keyboard.up('Control');
    
    // Allow UI animations to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 4. Inject Bot Identity into the Participant Guest input field
    console.log(`[Identity] Searching for profile configuration inputs...`);
    const nameInputSelector = 'input[type="text"]';
    await page.waitForSelector(nameInputSelector, { timeout: 10000 });
    await page.type(nameInputSelector, 'Recording Bot', { delay: 100 });

    // 5. Evaluate UI DOM nodes to target and click the Join Request button
    console.log(`[Network] Dispatching request to enter the call grid...`);
    await page.evaluate(() => {
      const buttonNodes = Array.from(document.querySelectorAll('button'));
      const activeJoinButton = buttonNodes.find(btn => 
        btn.textContent.includes('Ask to join') || 
        btn.textContent.includes('Join now') ||
        btn.textContent.includes('Join')
      );
      
      if (activeJoinButton) {
        activeJoinButton.click();
      } else {
        throw new Error('Target entry button interface node could not be resolved.');
      }
    });

    console.log(`[Status] Bot successfully pushed past lobby. Visual grid session active.`);
    
    // Keep process active to maintain streaming session (e.g., 30 minutes)
    const sessionDurationMs = 30 * 60 * 1000;
    await new Promise(resolve => setTimeout(resolve, sessionDurationMs));

  } catch (error) {
    console.error(`[Runtime Exception] Processing aborted: ${error.message}`);
  } finally {
    console.log(`[System] Terminating browser instance safely.`);
    await browser.close();
  }
}

// Execution trigger
const meetingTarget = process.argv[2] || 'https://meet.google.com/tvx-psnt-yfv';
runVisualBot(meetingTarget);
