# userscripts

Violentmonkey userscripts for Reddit, YouTube, and other sites.

A collection of small personal utility scripts I use to customize browser behavior. They are shared here in case anyone else wants to use or modify them.

## Requirements

Install a userscript manager such as:

* [Violentmonkey](https://violentmonkey.github.io/)
* Tampermonkey may also work, but these scripts are primarily tested with Violentmonkey.

## Installation

1. Install Violentmonkey.
2. Open the `.user.js` file for the script you want.
3. Click the **Raw** button on GitHub.
4. Violentmonkey should offer to install the script.
5. Review the source before installing.

---

# YouTube Scripts

## 1) YouTube Home — Dim Old + Highlight Low-View + AiSList

Customizes the YouTube home page to make unusual or potentially interesting videos easier to spot.

### What it does

* **Dims old videos**

  * Recommendations 1 year old or older are displayed with reduced opacity and grayscale.
  * Hovering over them temporarily restores the normal appearance.

* **Removes old, low-view tiles**

  * Videos more than 1 year old with fewer than 100,000 views are removed from the home-page grid.
  * YouTube can then fill the space with other recommendations.

* **Highlights low-view videos in yellow**

  * Videos at least 1 day old with fewer than 5,000 views are highlighted.
  * Useful for finding smaller channels or videos that YouTube may otherwise bury.

* **Highlights confirmed/high-confidence AI channels in red/pink**

  * Uses the public [AiSList](https://github.com/Override92/AiSList) blocklist.

* **Highlights AiSList warning channels in orange**

  * These are channels on the AiSList warnlist rather than its confirmed/high-confidence list.

* **Automatically updates AiSList data**

  * Lists are downloaded from GitHub and cached locally for 24 hours.

### Color key

| Appearance      | Meaning                                      |
| --------------- | -------------------------------------------- |
| Dim / grayscale | Video is at least 1 year old                 |
| Yellow          | At least 1 day old and under 5,000 views     |
| Red / pink      | AiSList confirmed/high-confidence AI channel |
| Orange          | AiSList warning / possible AI usage          |

AiSList classifications take precedence over the age/view highlighting.

### Configuration

Thresholds can be changed near the beginning of the script:

```javascript
const CUTOFF_DAYS = 365;
const LOW_VIEW_MIN_AGE_DAYS = 1;
const LOW_VIEW_MAX_VIEWS = 5000;
```

The visual opacity and highlighting values can also be adjusted there.

### External data

AI-channel highlighting uses data from:

**AiSList**
https://github.com/Override92/AiSList

This repository does not maintain or determine those classifications.

---

## 2) YouTube Live Chat Ding

Adds an audible notification to YouTube Live Chat so selected chat activity can be noticed without constantly watching the chat window.

### What it does

* Plays a short **ding** when configured chat text is detected.
* Useful while watching long-running livestreams where interesting events may be mentioned in chat before they are obvious on video.
* Runs directly in YouTube's live-chat interface through Violentmonkey.
* Does not require modifying the livestream itself.

### Why it exists

I originally made this for livestreams where I might have the video running in the background and want an audible cue when something interesting appears in chat.

Instead of continuously watching the chat window, the script can call attention to matching messages with a short sound.

### Volume behavior

The ding volume can be adjusted independently by the script.

Some versions may also adjust notification volume relative to the YouTube player's current volume so the notification remains noticeable without becoming excessively loud when the stream itself is turned up.

### Configuration

The terms or conditions that trigger the ding can be changed in the script.  You'll have to edit the URL to your page.

Review the configuration section near the beginning of the `.user.js` file before installing if you want different trigger words or behavior.

---

# Notes

These scripts modify websites that can change their HTML and JavaScript without notice. A script that works today may eventually need to be updated after a site redesign.

They are tested primarily in Firefox with Violentmonkey.

## License

MIT license.
