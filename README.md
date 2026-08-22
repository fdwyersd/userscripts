# userscripts
Violentmonkey userscripts for Reddit, Youtube and other sites

# Userscripts

A collection of Violentmonkey userscripts I use to customize Reddit, YouTube, and other websites.

These are small personal utility scripts that change or enhance browser behavior in ways I find useful. They are shared here in case anyone else wants to use or modify them.

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

## 1) YouTube Home — Dim Old + Highlight Low-View + AiSList

Customizes the YouTube home page to make unusual or potentially interesting videos easier to spot.

### What it does

* **Dims videos 1 year old or older**

  * Old recommendations are displayed with reduced opacity and grayscale.
  * Hovering over them temporarily restores the normal appearance.

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

## Notes

These scripts modify websites that can change their HTML and JavaScript without notice. A script that works today may eventually need to be updated after a site redesign.

They are tested primarily in Firefox with Violentmonkey.

## License

Unless otherwise noted, feel free to use, modify, and adapt these scripts for personal use.
