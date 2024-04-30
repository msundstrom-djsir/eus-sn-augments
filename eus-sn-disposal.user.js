// ==UserScript==
// @name         DJSIR ServiceNow Hardware Disposal
// @namespace    https://djpr.service-now.com/
// @version      0.2.0
// @description  Adds shortcuts to DJSIR ServiceNow Hardware Asset Page
// @author       Michell Sundstrom
// @match        https://djpr.service-now.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @updateURL    https://github.com/msundstrom-djsir/eus-sn-augments/raw/main/eus-sn-disposal.user.js
// @downloadURL  https://github.com/msundstrom-djsir/eus-sn-augments/raw/main/eus-sn-disposal.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function iframeLoaded() {
        let iframeBody = document.getElementById("gsft_main");
        let iframeDoc = iframeBody.contentDocument || iframeBody.contentWindow.document;
        if (iframeDoc.readyState == "complete") {
            iframeBody.contentWindow.onload = function() {
                alert("iframe loaded");
                return true;
            };
        };

        return false;
    };

    function insertAfter(newNode, existingNode) {
        existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
    }

    function main() {
        //
        // Setup
        //

        let itemType = document.getElementById("alm_hardware.model_category_label");
        if (itemType.value !== "Computer") {
            return false;
        };

        let navbarUpdateBtn = document.getElementById("sysverb_update");

        let disposalTypes = [
            {
                title: "Dispose - EOL",
                hint: "Mark as disposed - End of Life",
                disposal_reason: "EOL"
            },
            {
                title: "Dispose - OOW",
                hint: "Mark as disposed - Out of Warranty, Damaged",
                disposal_reason: "OOW - Damaged"
            }
        ];

        for (let i = 0; i < disposalTypes.length; i++) {
            let btnAction = document.createElement("button");
            btnAction.className = `btn-default btn`;
            btnAction.setAttribute("type", "button");
            btnAction.setAttribute("title", disposalTypes[i].hint);
            btnAction.style["margin-left"] = "4px";
            btnAction.style["margin-right"] = "4px";
            btnAction.textContent = disposalTypes[i].title;

            btnAction.addEventListener("click", () => {
                let fieldInstallStatus = document.getElementById("alm_hardware.install_status");
                let fieldInstallSubStatus = document.getElementById("alm_hardware.substatus");
                let fieldDisposalReason = document.getElementById("alm_hardware.disposal_reason");
                let fieldDisposalDate = document.getElementById("alm_hardware.retired");
                let date = new Date();

                fieldInstallStatus.value = 7;
                fieldInstallStatus.dispatchEvent(new Event("change"));
                fieldDisposalReason.value = disposalTypes[i].disposal_reason;
                fieldDisposalDate.value = date.getDate().toString().padStart(2, 0) + '-' + (date.getMonth() + 1).toString().padStart(2, 0) + '-' + date.getFullYear().toString();
                setTimeout(() => {
                    fieldInstallSubStatus.value = "disposed";
                }, 300);
            }, false);

            navbarUpdateBtn.parentNode.insertBefore(btnAction, navbarUpdateBtn);
        };
    };

    let iframeReady = false;

    main();
})();
