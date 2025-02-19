function verifyCallback(response) {
    if (response) {
        // Send success message back to the main extension
        window.opener.postMessage("recaptchaSuccess", "*");
        window.close();
    }
}