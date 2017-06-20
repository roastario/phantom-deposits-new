const phantom = require('phantom');
const moment = require('moment');

const argv = require('yargs').argv;

const surname = argv.surname;
const imageSuffix = argv.image;
const tenancyDate = moment(argv.tenancyDate, 'YYYY-MM-DD');
const postCode = argv.postCode;
const depositAmount = argv.depositAmount;

const year = tenancyDate.year();
const month = tenancyDate.month();
const day = tenancyDate.date();


async function dps(phantomInstance) {
    const page = await phantomInstance.createPage();
    const status = await page.open('https://www.depositprotection.com/is-my-deposit-protected');

    if (status !== 'success') {
        console.log(' failed to load dps ');
        return;
    }

    let viewPort = await page.property('viewportSize');
    console.log('current viewport has size of: ' + JSON.stringify(viewPort) + ' setting to 1280x720');
    let viewPortSetting = await page.property('viewportSize', {width: 1280, height: 720});
    console.log(!viewPortSetting ? 'current viewport has size of ' + JSON.stringify(await page.property('viewportSize')) : 'failed to adjust viewport');


    console.log('populating dps Tenant surname');
    let surnameResult = await page.evaluate(function (surname) {
        const element = document.getElementById('Body_DepositFinder_DepositSearchPanels_ctl00_SurnameField');
        element.value = surname;
        return 'success';
    }, surname);

    console.log('populating tenancy start');
    let tenancyStartResult = await page.evaluate(function (day, month, year) {
        const monthDropDown = document.querySelector('#Body_DepositFinder_DepositSearchPanels_ctl00_MonthsList');
        monthDropDown.value = month + 1;

        const yearDropDown = document.querySelector('#Body_DepositFinder_DepositSearchPanels_ctl00_YearsList');
        yearDropDown.value = year;
        return 'success';
    }, day, month, year);

    console.log('populating property postcode');
    let postCodeResult = await page.evaluate(function (postCode) {
        const postCodeField = document.querySelector('#Body_DepositFinder_DepositSearchPanels_ctl00_PostcodeField');
        postCodeField.value = postCode;
        return 'success';
    }, postCode);

    console.log('populating deposit amount');
    let depositAmountResult = await page.evaluate(function (depositAmount) {
        const depositAmountField = document.querySelector('#Body_DepositFinder_DepositSearchPanels_ctl00_AmountField');
        depositAmountField.value = depositAmount;
        return 'success';
    }, depositAmount);

    let dataRenderResult = await page.render('data-dps-' + imageSuffix).then(function (input) {
        return input
    });
    console.log(dataRenderResult ? 'File created at [' + 'data-dps-' + imageSuffix + ']' : ' failed to screenshot DPS');
    console.log('Invoking Check for deposit');


    let clickResult = await page.evaluate(function () {
        var submittor = $('#Body_DepositFinder_CheckButton');
        console.log(submittor);
        submittor.click();
        return "clicked";
    });

    let loaded = false;
    await sleep(500);

    let waitLoops = 0;
    while (!loaded && waitLoops < 10) {
        loaded = await page.evaluate(function () {
            const found = document.querySelector('.alert.information');
            const notfound = document.querySelector('.alert.warning');
            console.log((found || notfound));
            return (found || notfound);
        });
        await sleep(500);
        waitLoops++;
    }

    let checkRenderResult = await page.render('check-dps-' + imageSuffix).then(function (input) {
        return input
    });

    console.log(checkRenderResult ? 'File created at [' + 'check-dps-' + imageSuffix + ']' : ' failed to screenshot DPS')
    return "OK"
}


async function tds(phantomInstance) {

    let page = await phantomInstance.createPage();
    const status = await page.open('https://www.thedisputeservice.co.uk/is-my-deposit-protected.html');
    console.log("attempting to expand deposit information box");
    let expander = await page.evaluate(function () {
        var submittor = $('#lookup_button');
        submittor.click();
        return "clicked";
    });
    let isExpanded = false;
    let waitLoops = 0;
    await sleep(100);
    while (!isExpanded && waitLoops < 10) {
        isExpanded = await page.evaluate(function () {
            const popup = document.querySelector('#lookup_popup');
            return !!(popup || false);
        });
        await sleep(100);
        waitLoops++;
    }

    if (!isExpanded) {
        console.log("failed to expand deposit information box");
    } else {
        console.log("was able to expand the deposit information box");
    }

    console.log("populating deposit amount");
    let depositAmountResult = await page.evaluate(function (depositAmount) {
        const depositAmountField = $("input[name='deposit_amount']");
        depositAmountField.val(depositAmount);
        return 'success';
    }, depositAmount);

    console.log("populating Tenancy Postcode");
    let postCodeResult = await page.evaluate(function (postCode) {
        const postCodeField = $("input[name='postcode']");
        postCodeField.val(postCode);
        return 'success';
    }, postCode);

    console.log("populating Tenancy Surname");
    let surnameResult = await page.evaluate(function (surname) {
        const postCodeField = $("input[name='surname']");
        postCodeField.val(surname);
        return 'success';
    }, surname);

    console.log("populating Tenancy Start Date");
    let dateResult = await page.evaluate(function (date) {
        const postCodeField = $("input[name='tenancy_start_date']");
        postCodeField.val(date);
        return 'success';
    }, tenancyDate.format('DD/MM/YYYY'));

    let dataRenderResult = await page.render('data-tds-' + imageSuffix).then(function (input) {
        return input
    });
    console.log(dataRenderResult ? 'File created at [' + 'data-tds-' + imageSuffix + ']' : ' failed to screenshot TDS');


    page.on('onResourceRequested', function (requestData) {
        console.info('Requesting', requestData.url)
    });

    page.on('onResourceRecieved', function (response) {
        console.info('Requesting', response.url)
    });

    let clickResult = await page.evaluate(function () {
        var submittor = $("input[type='submit']");
        submittor.click();
        return "clicked";
    });

    let hasLoaded = false;
    waitLoops = 0;
    while (!hasLoaded && waitLoops < 20) {
        hasLoaded = await page.evaluate(function () {
            var notfound = $('div.notification_message');
            var found = $('fieldset.protected_box.top_protected_box');
            console.log(found.length + ", " + notfound.length + " -> " + !(found.length || notfound));
            return !(found.length || notfound);
        });
        await sleep(1000);
        waitLoops++;
    }

    console.log(hasLoaded ? "successfully loaded deposit check" : "failed to load deposit check");

    let checkRenderResult = await page.render('check-tds-' + imageSuffix).then(function (input) {
        return input
    });
    console.log(checkRenderResult ? 'File created at [' + 'check-tds-' + imageSuffix + ']' : ' failed to screenshot TDS');


    return "OK";

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async function () {
    const instance1 = await phantom.create();
    const instance2 = await phantom.create();
    let results = await Promise.all([tds(instance1), dps(instance2)]);
    console.log(results);
    let exitResult = await Promise.all([instance1.exit(), instance2.exit()]);
}());