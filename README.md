# Chrome Extension - Installation Guide

This Chrome Extension is designed for my research project on user behavior regarding security and privacy tasks during everyday browsing. At certain moments, the extension may prompt you with short surveys based on your interactions.

## Prerequisites

- You must be on a Google Chrome Browser, the extension only runs in Chrome.

## Installation

1. Click on the Releases section
2. Under version v1.0.0, download chrome-extension.zip
3. Open a chrome browser
4. Navigate to `chrome://extensions/` or click on the three dots in the top right corner and
   select `More tools` -> `Extensions`
5. Enable `Developer mode` in the top right corner
6. Click on `Load unpacked`
7. Select the folder you extracted from the ZIP file
8. The extension will now appear in your Chrome Extension list

## Usage and Study

For this part of the study, use your browser as you normally would. The extension will occasionally provide you with security-related suggestions as part of the study. After each interaction you'll be asked to complete a brief survey. Please keep the extension enabled during the whole study duration. You can see whether the study is still active by clicking on the extension icon in the toolbar. Once the study is finished feel free to remove the extension.

## Privacy Policy

### Data Collection

The extension will collect the following private information:

- your email addresses (Provided by you)
- domains of some visited websites (encrypted)
- These domains will only include sites known to support 2FA or sites with recorded data breaches

### Data Encryption

Your data is transmitted and stored securely using industry-standard encryption methods to prevent unauthorized access or disclosure.

### Data Storage

Encrypted personal information is stored on secure servers that use a variety of security technologies and procedures to help protect your personal information. We use [MongoDB Atlas](https://www.mongodb.com/de-de/atlas) for cloud storage and LMU SmartConfig Server for cloud computing.
After the study is finished, personal data will be permanently deleted from our systems.

### Data Usage

Your data will never be shared with third parties. Your personal information will only be used to improve the extension and to provide better insights into the user's security behavior.

Every email address you provide will be used to
search for breaches in the [Have I Been Pwned](https://haveibeenpwned.com/) database.
