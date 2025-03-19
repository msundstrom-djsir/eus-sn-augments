// ==UserScript==
// @name         DJSIR ServiceNow Hardware Order Augments
// @namespace    https://djpr.service-now.com/
// @version      0.5.6
// @description  Adds shortcuts to DJSIR ServiceNow Hardware fulfillment page
// @author       Michell Sundstrom
// @match        https://djpr.service-now.com/*
// @match        https://djprdev.service-now.com/*
// @match        https://djpruat.service-now.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @updateURL    https://github.com/msundstrom-djsir/eus-sn-augments/raw/main/eus-sn-augments.user.js
// @downloadURL  https://github.com/msundstrom-djsir/eus-sn-augments/raw/main/eus-sn-augments.user.js
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

        let variableContainer = document.querySelector(".veditor_body");

        if (!variableContainer) {
            return false;
        };

        let itemType = document.getElementById("sys_display.sc_req_item.cat_item");
        if (itemType.value !== "Desktop Hardware Request") {
            return false;
        };

        let isCellularOrder = false;
        let cellularXPath = "//label[text()='I have a data SIM and require a SIM slot/4G connection - $150.00']";
        let cellularLabel = document.evaluate(cellularXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (cellularLabel) {
            let cellularLabelId = cellularLabel.getAttribute("for");
            isCellularOrder = document.getElementById(cellularLabelId).checked;
        }

        let formFields = variableContainer.querySelectorAll(".form-control");

        variableContainer.querySelector("#img_c3cb6fa287ef15101a5cbae8dabb35c5").click();
        let formWhitelist = ["Requested for", "Contact Number", "Delivery Address", "Old Computer Name",
                             "Replacement or Upgrade","Other Justification", "Commencement Date", "Additional comments",
                             "Charge Code", "Select Financial Delegate", "Other Hardware Not Listed", "Financial delegate", "Charge code", "Legacy Charge Code", "Legacy Select Financial Delegate"];
        let formValues = {};
        let hardwareValues = {};
        for (let i in formFields) {
            let field = formFields[i];
            if (typeof field !== "object") continue;

            let id = field.getAttribute("id");
            let labelEl = variableContainer.querySelector("label[for='" + id + "'] span.sn-tooltip-basic");
            if (labelEl) {
                let label = labelEl.getAttribute("aria-label").split(" - ")[0].trim();
                if (formWhitelist.includes(label)) {
                    formValues[label] = field.value;
                } else {
                    if (label === "Dell Latitude Laptop" && isCellularOrder) {
                        label = "Dell Latitude Laptop (4G)";
                    };
                    hardwareValues[label] = field.value;
                };
            };
        };

        let ritmNumber = document.getElementById("sc_req_item.number").value;
        let isReplacementOrder = document.querySelector('input[value="replace_old_pc_peripherals"]').checked;

        //
        // Hardware summary
        //

        let outputTextUserInfo = `Requested for: ${formValues["Requested for"]}
Contact number: ${formValues["Contact Number"]}
Delivery address: ${formValues["Delivery Address"]}

Charge code: ${formValues["Charge Code"] || formValues["Charge code"] || formValues["Legacy Charge Code"]}
Financial delegate: ${formValues["Select Financial Delegate"] || formValues["Financial delegate"] || formValues["Legacy Select Financial Delegate"]}

Commencement date: ${formValues["Commencement Date"]}
Old computer name: ${formValues["Old Computer Name"]}
Other justification: ${formValues["Other Justification"]}
Other comments: ${formValues["Additional comments"]}

Requested hardware:
`;

        for (const key in hardwareValues) {
            if (parseInt(hardwareValues[key]) > 0) {
                outputTextUserInfo += `${hardwareValues[key]} x ${key}\n`;
            };
        };

        if ("Other Hardware Not Listed" in formValues && formValues["Other Hardware Not Listed"] !== "") {
            outputTextUserInfo += `\nNon-standard hardware:\n`;
            outputTextUserInfo += formValues["Other Hardware Not Listed"];
        };

        let outputContainer = document.createElement("textarea");
        outputContainer.className = "sn-string-textarea form-control";
        outputContainer.setAttribute("style", "margin-top: 1.2rem; width: 100%; overflow-wrap: break-word; resize: none; height: 500px;");
        outputContainer.textContent = outputTextUserInfo;

        insertAfter(outputContainer, variableContainer);

        //
        // Hardware table
        //
        let hardwareList = [];
        for (const key in hardwareValues) {
            if (parseInt(hardwareValues[key]) > 0) {
                hardwareList.push(`${hardwareValues[key]} x ${key}`);
            };
        };
        let tableData = {
            "Name": formValues["Requested for"],
            "Request ID": ritmNumber,
            "Order": hardwareList.join(", "),
            "Peripherals": formValues["Other Hardware Not Listed"],
            "Contact Number": `'${formValues["Contact Number"]}`,
            "Address": formValues["Delivery Address"],
            "Labels": " ",
            "Company": "Department of Jobs, Skills, Industry and Regions",
            "Charge Code": formValues["Charge Code"]
        };

        let tableEl = document.createElement("table");
        let tbodyEl = document.createElement("tbody");
        for (const field in tableData) {
            let tr = document.createElement("tr");
            let keyCell = document.createElement("td");
            let valueCell = document.createElement("td");

            keyCell.appendChild(document.createTextNode(field));
            valueCell.appendChild(document.createTextNode(tableData[field]));

            keyCell.style["font-size"] = "11pt";
            keyCell.style["font-family"] = "Calibri";
            valueCell.style["font-size"] = "11pt";
            valueCell.style["font-family"] = "Calibri";

            if (["Order", "Peripherals"].includes(field)) {
                tr.style["background-color"] = "#8ea9db";
            };

            tr.appendChild(keyCell);
            tr.appendChild(valueCell);
            tbodyEl.appendChild(tr);
        };
        tableEl.appendChild(tbodyEl);

        tableEl.style["background-color"] = "#b4c6e7";
        tableEl.style.position = "absolute";
        tableEl.style.top = "-99999px";
        tableEl.style.left = "-99999px";

        insertAfter(tableEl, outputContainer);

        let copyBtn = document.createElement("button");
        copyBtn.className = `icon-copy btn-default btn`;
        copyBtn.style.float = "right";
        copyBtn.style["margin-top"] = "5px";
        copyBtn.setAttribute("type", "button");
        copyBtn.setAttribute("title", "Copy Outgoing Order");

        copyBtn.addEventListener("click", () => {
            selectElementContents(tableEl);
        }, false);

        insertAfter(copyBtn, tableEl);

        //
        // Auto responses
        // https://djpr.service-now.com/styles/retina_icons/retina_icons.html
        //

        let requestForFirstName = formValues["Requested for"].split(" ")[0];
        let collectBy = new Date(Date.now() + (6.048e+8 * 2)).toLocaleDateString("en-AU");
        let futureEstimateDate = new Date(Date.now() + (6.048e+8 * 6)).toLocaleDateString("en-AU");
        let autoResponseContainer = document.createElement("div");
        autoResponseContainer.className = "col-xs-2 col-md-1_5 col-lg-2 form-field-addons form-toggle-inputs";
        let unlockCode = ritmNumber.substr(ritmNumber.length - 4);

        const autoResponses = [
            {
                "icon": "icon-envelope-open",
                "title": "Collection via 121.31 Lockers",
                "text": `Hi ${requestForFirstName},

Your requested hardware is now available for you to collect from the Level 31 IT Collection lockers.

To find the lockers from the Level 31 lift lobby, exit on the Sports and Experience Economy/Exhibition Street side. Turn left in to the corridor and look for the 'Tech Shop' sign between the seating booths. Additional details and visual instructions can be found here: <a title='KB0011364 : Where do I collect my computer hardware orders from at 121 Exhibition Street?' href='https://djpr.service-now.com/sp?id=kb_article_view&sysparm_article=KB0011364'>KB0011364 : Where do I collect my computer hardware orders from at 121 Exhibition Street?</a>

Locker: 00
Code: ${unlockCode}

If you need assistance please visit the Corporate Support Team on Level 32, Monday to Thursday between 9:30 am and 4:00 pm.`
            },
            {
                "icon": "icon-envelope-subscribe",
                "title": "Collection via 121.32 Corporate Support",
                "text": `Hi ${requestForFirstName},

Your requested hardware is now available for you to collect.

Please see the Corporate Support Team on Level 32, Monday to Thursday between 9:30 am and 3:00 pm by ${collectBy} to collect your equipment. Please have your name and request number (${ritmNumber}) ready.`
            },
            {
                "icon": "icon-mail",
                "title": "Collection via 121.32 Mail Room",
                "text": `Hi ${requestForFirstName},

Your requested hardware is now available for you to collect.

This can be collected from the Level 32 Mail Centre, Monday to Friday between 1:30 pm and 2:00 pm by ${collectBy}. Please quote your name and ${ritmNumber} as your request number.`
            },
            {
                "icon": "icon-phonecall-incoming",
                "title": "Collection via 121 Lobby (external)",
                "text": `Hi ${requestForFirstName},

Your requested hardware is now available for you to collect.

This will need to be collected from the Corporate Support Team at 121 Exhibition Street, Melbourne, Monday to Thursday between 9:30 am and 3:00 pm by ${collectBy}.

Once you arrive at the 121 Exhibition Street lobby please call 1800 370 724 and let them know that you are collecting hardware. Please quote your name and ${ritmNumber} as your request number.`
            },
            {
                "icon": "icon-cart-full",
                "title": "Delivery Dispatched via TNT",
                "text": `Hi ${requestForFirstName},

Your requested hardware has been dispatched via TNT courier. Tracking is available at https://www.tnt.com/express/en_au/site/shipping-tools/tracking.html?searchType=con&cons=XXXXXXXXX`
            },
            {
                "icon": "icon-location",
                "title": "Revise Delivery Address",
                "excludeLaptopMsg": true,
                "text": `Hi ${requestForFirstName},

Please provide an office delivery address for this request.

We are unable to deliver to home addresses or PO boxes.`
            },
            {
                "icon": "icon-notification-bell",
                "title": "Reminder of Collection via 121.31 Lockers",
                "text": `Hi ${requestForFirstName},

This is a reminder that you have uncollected hardware waiting for you at the Level 31 IT Collection lockers.

To find the lockers from the Level 31 lift lobby, exit on the Sports and Experience Economy/Exhibition Street side. Turn left in to the corridor and look for the 'Tech Shop' sign between the seating booths. Additional details and visual instructions can be found here: <a title='KB0011364 : Where do I collect my computer hardware orders from at 121 Exhibition Street?' href='https://djpr.service-now.com/sp?id=kb_article_view&sysparm_article=KB0011364'>KB0011364 : Where do I collect my computer hardware orders from at 121 Exhibition Street?</a>

Locker: 00
Code: ${unlockCode}

If you need assistance please visit the Corporate Support Team on Level 32, Monday to Thursday between 9:30 am and 4:00 pm.

Please make it a priority to collect this equipment as soon as possible. If you are having difficulty collecting this equipment, please call the Corporate Support Team on 1800 370 724 to make alternate arrangements.

If the equipment is no longer required please let us know via return email.`
            },
            {
                "icon": "icon-alert-triangle",
                "title": "Windows 11 Delay",
                "show": true,
                "excludeLaptopMsg": true,
                "text": `Hi ${requestForFirstName},

We regret to inform you that your request has been delayed. It is now expected by 28-03-2024.

If your request includes peripherals such as a keyboard bundle or headset that you would like to receive earlier, please let us know by replying to this message.

Thank you for your patience.`
            }
        ];
        const hardwareThatIncludesLaptop = ["Dell Latitude Starter Pack", "Dell Latitude Laptop", "Dell Latitude Laptop (4G)", "MS Surface Pro", "Microsoft Surface Pro Starter Pack"];
        const requestIncludesLaptop = () => {
            for (let key in hardwareValues) {
                if (hardwareThatIncludesLaptop.includes(key) && hardwareValues[key] >= 1) {
                    return true;
                };
            };
            return false;
        };
        const autoResponseIsReplacementOrderMessage = `

If this order is replacing old computer equipment, please find information on returning it here: <a title='How do I get started with my new department laptop?' href='https://djpr.service-now.com/sp?id=kb_article_view&sysparm_article=KB0011182'>KB0011182 : How do I dispose of old computer equipment?</a>`;
        const autoResponseHasLaptopExtraMessage = `

For information regarding setting up a new department laptop, please refer the following article: <a title='How do I get started with my new department laptop?' href='https://djpr.service-now.com/sp?id=kb_article&sysparm_article=KB0011192'>KB0011192 : How do I get started with my new department laptop?</a>`;
        const autoResponseIsCellularMessage = `

If you do not currently have a 4G data SIM card for this laptop you will need to request one separately here: <a title='New Mobile Device Order Form' href='https://djpr.service-now.com/sp?id=sc_cat_item&sys_id=cdbe936187827150d1c98407dabb3554&sysparm_category=66d00feadbf7d010764bcae43a9619a4'>Mobile Device Order Form</a>`;

        const autoResponseHeading = document.createElement("h6");
        autoResponseHeading.textContent = "Quick Replies";
        autoResponseHeading.style["display"] = "block";
        autoResponseHeading.style["width"] = "100%";
        autoResponseContainer.appendChild(autoResponseHeading);

        for (let i = 0; i < autoResponses.length; i++) {
            if (autoResponses[i].hasOwnProperty('show') && autoResponses[i].show === false) {
                continue;
            };

            let autoBtn = document.createElement("button");
            autoBtn.className = `${autoResponses[i].icon} btn-default btn`;
            autoBtn.setAttribute("type", "button");
            autoBtn.setAttribute("title", autoResponses[i].title);
            autoBtn.style["margin-left"] = 0;
            autoBtn.style["margin-bottom"] = "5px";

            autoBtn.addEventListener("click", () => {
                let custComments = document.getElementById("activity-stream-comments-textarea");
                custComments.value += autoResponses[i].text;
                if (!autoResponses[i].hasOwnProperty("excludeLaptopMsg") && requestIncludesLaptop()) {
                    if (isCellularOrder) {
                        custComments.value += autoResponseIsCellularMessage;
                    };

                    custComments.value += autoResponseHasLaptopExtraMessage;

                    if (isReplacementOrder) {
                        custComments.value += autoResponseIsReplacementOrderMessage;
                    };
                };

                custComments.focus();
                custComments.dispatchEvent(
                    new Event("input", { bubbles: true, cancelable: true })
                );
            }, false);

            autoResponseContainer.appendChild(autoBtn);
        };

        document.querySelectorAll('[ng-init="activity_field_1 = getStubbedFieldModel(\'comments\')"')[0].appendChild(autoResponseContainer);
    };

    let iframeReady = false;

    main();


    //
    // Utils
    //

    let selectElementContents = (el) => {
        var body = document.body, range, sel;
        if (document.createRange && window.getSelection) {
            range = document.createRange();
            sel = window.getSelection();
            sel.removeAllRanges();
            try {
                range.selectNodeContents(el);
                sel.addRange(range);
                document.execCommand("copy");
            } catch (e) {
                range.selectNode(el);
                sel.addRange(range);
                document.execCommand("copy");
            }
        } else if (body.createTextRange) {
            range = body.createTextRange();
            range.moveToElementText(el);
            range.select();
        };
    };
})();
