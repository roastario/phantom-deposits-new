const phantom = require('phantom');
const moment = require('moment');

const argv = require('yargs').argv;

const surname = argv.surname;
const imageSuffix = argv.image;
const tenancyDate = moment(argv.tenancyStart, 'YYYY/MM/DD');
const postCode = argv.postCode;
const depositAmount = argv.depositAmount;

const year = tenancyDate.year();
const month = tenancyDate.month();
const day = tenancyDate.day();


async function dps(phantomInstance) {
    const page = await phantomInstance.createPage();
    const status = await page.open('https://www.depositprotection.com/is-my-deposit-protected');

    if (status !== 'success') {
        console.log(' failed to load dps ');
        return;
    }

    page.on('consoleMessage', function(msg, lineNum, sourceId){
        console.log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    });

    page.on('navigationRequested', function(url, type, willNavigate, main){
        console.log('Trying to navigate to: ' + url);
        console.log('Caused by: ' + type);
        console.log('Will actually navigate: ' + willNavigate);
        console.log('Sent from the page\'s main frame: ' + main);
    });

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
        monthDropDown.value = month;

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

    let checkResult = await page.evaluate(function () {
        var form = document.querySelector("form");
        form.submit();
        var isLoaded = false;
        const startTime = new Date().getTime();
        while ((new Date().getTime() - startTime) < 5000 && !isLoaded) {
            const found = document.querySelector('.alert.information');
            const notfound = document.querySelector('.alert.warning');
            isLoaded = (found || notfound);
            console.log(isLoaded ? "did not find " : " found");
        }
        return isLoaded;
    });

    let checkRenderResult = await page.render('check-dps-' + imageSuffix).then(function (input) {
        return input
    });

    console.log(checkRenderResult ? 'File created at [' + 'check-dps-' + imageSuffix + ']' : ' failed to screenshot DPS')
    return "OK"
}

(async function () {
    const instance = await phantom.create();

    let result = await dps(instance);
    console.log(result);
    await instance.exit();
}());