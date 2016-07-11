$.fn.cron = function(options, setValue) {
    var el = this;

    var words = {
        "Every %s seconds": {"en": "Every %s seconds",  "de": "Alle %s Sekunden", "ru": "Каждые %s секунд(ы)"},
        "Every %s minutes": {"en": "Every %s minutes",  "de": "Every %s minutes", "ru": "Every %s minutes"},
        "Clear":            {"en": "Clear",             "de": "Clear", "ru": "Clear"},
        "Jan":              {"en": "Jan",               "de": "Jan", "ru": "Jan"},
        "Feb":              {"en": "Feb",               "de": "Feb", "ru": "Feb"},
        "March":            {"en": "March",             "de": "March", "ru": "March"},
        "April":            {"en": "April",             "de": "April", "ru": "April"},
        "May":              {"en": "May",               "de": "May", "ru": "May"},
        "June":             {"en": "June",              "de": "June", "ru": "June"},
        "July":             {"en": "July",              "de": "July", "ru": "July"},
        "Aug":              {"en": "Aug",               "de": "Aug", "ru": "Aug"},
        "Sept":             {"en": "Sept",              "de": "Sept", "ru": "Sept"},
        "Oct":              {"en": "Oct",               "de": "Oct", "ru": "Oct"},
        "Nov":              {"en": "Nov",               "de": "Nov", "ru": "Nov"},
        "Dec":              {"en": "Dec",               "de": "Dec", "ru": "Dec"},
        "Sunday":           {"en": "Sunday",            "de": "Sunday", "ru": "Sunday"},
        "Monday":           {"en": "Monday",            "de": "Monday", "ru": "Monday"},
        "Tuesday":          {"en": "Tuesday",           "de": "Tuesday", "ru": "Tuesday"},
        "Wednesday":        {"en": "Wednesday",         "de": "Wednesday", "ru": "Wednesday"},
        "Thursday":         {"en": "Thursday",          "de": "Thursday", "ru": "Thursday"},
        "Friday":           {"en": "Friday",            "de": "Friday", "ru": "Friday"},
        "Saturday":         {"en": "Saturday",          "de": "Saturday", "ru": "Saturday"},
        "Second":           {"en": "Second",            "de": "Second", "ru": "Second"},
        "Minute":           {"en": "Minute",            "de": "Minute", "ru": "Minute"},
        "Hour":             {"en": "Hour",              "de": "Hour", "ru": "Hour"},
        "Month":            {"en": "Month",             "de": "Month", "ru": "Month"},
        "Day of Week":      {"en": "Day of Week",       "de": "Day of Week", "ru": "Day of Week"},
        "Every second":     {"en": "Every second",      "de": "Every second", "ru": "Every second"},
        "Every n seconds":  {"en": "Every n seconds",   "de": "Every n seconds", "ru": "Every n seconds"},
        "Every second.":    {"en": "Every second.",     "de": "Every second.", "ru": "Every second."},
        "Every 1 seconds":  {"en": "Every 1 seconds",   "de": "Every 1 seconds", "ru": "Every 1 seconds"},
        "Every Minute":     {"en": "Every Minute",      "de": "Every Minute", "ru": "Every Minute"},
        "Every n minutes":  {"en": "Every n minutes",   "de": "Every n minutes", "ru": "Every n minutes"},
        "Each Selected Minute": {"en": "Each Selected Minute", "de": "Each Selected Minute", "ru": "Each Selected Minute"},
        "Every minute.":    {"en": "Every minute.",     "de": "Every minute.", "ru": "Every minute."},
        "Each selected minute": {"en": "Each selected minute", "de": "Each selected minute", "ru": "Each selected minute"},
        "Every Hour":       {"en": "Every Hour",        "de": "Every Hour", "ru": "Every Hour"},
        "Every n Hours":    {"en": "Every n Hours",     "de": "Every n Hours", "ru": "Every n Hours"},
        "Each Selected Hour": {"en": "Each Selected Hour", "de": "Each Selected Hour", "ru": "Each Selected Hour"},
        "Every hour":       {"en": "Every hour",        "de": "Every hour", "ru": "Every hour"},
        "Each selected hour": {"en": "Each selected hour", "de": "Each selected hour", "ru": "Each selected hour"},
        "Every Day":        {"en": "Every Day",         "de": "Every Day", "ru": "Every Day"},
        "Each Day":         {"en": "Each Day",          "de": "Each Day", "ru": "Each Day"},
        "Each selected Day": {"en": "Each selected Day", "de": "Each selected Day", "ru": "Each selected Day"},
        "Every Month":      {"en": "Every Month",       "de": "Every Month", "ru": "Every Month"},
        "Each Month":       {"en": "Each Month",        "de": "Each Month", "ru": "Each Month"},
        "Every month":      {"en": "Every month",       "de": "Every month", "ru": "Every month"},
        "Each selected month": {"en": "Each selected month", "de": "Each selected month", "ru": "Each selected month"},
        "Every Week":       {"en": "Every Week",        "de": "Every Week", "ru": "Every Week"},
        "Each Week":        {"en": "Each Week",         "de": "Each Week", "ru": "Each Week"}
    };

    if (typeof systemDictionary !== 'undefined' && !systemDictionary["Every %s seconds"]) {
        for (var w in words) {
            systemDictionary[w] = words[w];
        }
    }

    if (options === 'value') {
        if (setValue !== undefined) {
            $('#cron-input').val(setValue);
        } else {
            return $('#cron-input').val();
        }
        return this;
    }

    // Write the HTML template to the document
    $(el).html(tmpl);
    if (typeof translateAll !== 'undefined') translateAll();

    var cronArr = ['*', '*', '*', '*', '*', '*'];
    if (typeof options.value === 'string') {
        cronArr = options.value.split(' ');
    }

    $('.cron-tabs').tabs({
        activate: function( event, ui ) {
            switch ($(ui.newTab).attr('id')) {

                // Seconds
                case 'cron-button-second-every':
                    cronArr[0] = '*';
                    break;
                case 'cron-button-second-n':
                    cronArr[0] = '*/' + $('#cron-tabs-second .cron-slider').slider('value');
                    break;

                // Minutes
                case 'cron-button-minute-every':
                    cronArr[1] = '*';
                    break;
                case 'cron-button-minute-n':
                    cronArr[1] = '*/' + $('#cron-tabs-minute .cron-slider').slider('value');
                    break;
                case 'cron-button-minute-each':
                    cronArr[1] = '*';
                    $('.cron-tabs-minute-format').html('');
                    drawEachMinutes();
                    break;

                // Hours
                case 'cron-button-hour-every':
                    cronArr[2] = '*';
                    break;
                case 'cron-button-hour-n':
                    cronArr[2] = '*/' + $('#cron-tabs-hour .cron-slider').slider('value');
                    break;
                case 'cron-button-hour-each':
                    cronArr[2] = '*';
                    $('.cron-tabs-hour-format').html('');
                    drawEachHours();
                    break;

                // Days
                case 'cron-button-day-every':
                    cronArr[3] = '*';
                    break;
                case 'cron-button-day-each':
                    cronArr[3] = '*';
                    $('.cron-tabs-day-format').html('');
                    drawEachDays();
                    break;

                // Months
                case 'cron-button-month-every':
                    cronArr[4] = '*';
                    break;
                case 'cron-button-month-each':
                    cronArr[4] = '*';
                    $('.cron-tabs-month-format').html('');
                    drawEachMonths();
                    break;

                // Weeks
                case 'cron-button-week-every':
                    cronArr[5] = '*';
                    break;
                case 'cron-button-week-each':
                    cronArr[5] = '*';
                    $('.cron-tabs-week-format').html('');
                    drawEachWeek();
                    break;

            }

            drawCron();
        }
    });

    function drawCron () {
        var newCron = cronArr.join(' ');
        $('#cron-input').val(newCron);
    }

    function detectSettings(value) {
        cronArr = value.split(' ');
        if (cronArr.length === 5) cronArr.unshift('*');

        detectSeconds(cronArr[0]);
        /*detectMinutes(cronArr[1]);
        detectHours(cronArr[2]);
        detectDays(cronArr[3]);
        detectMonth(cronArr[4]);
        detectDaysOfWeek(cronArr[5]);*/
    }

    function detectSeconds(value) {
        value = value || '*';
        if (value.indexOf('/') !== -1) {
            var parts = value.split('/');
            $('#cron-tabs-second .cron-slider').slider('value', parts[1] || 1);
        } else {

        }
    }

    $('#cron-tabs-second .cron-slider').slider({
        min: 1,
        max: 59,
        slide: function (event, ui) {
            cronArr[0] = '*/' + ui.value;
            $('#cron-tabs-second-n .cron-preview').html(_('Every %s seconds', ui.value));
            drawCron();
        }
    });

    $('#cron-tabs-minute .cron-slider').slider({
        min: 1,
        max: 59,
        slide: function( event, ui ) {
            cronArr[1] = '*/' + ui.value;
            $('#cron-tabs-minute-n .cron-preview').html(_('Every %s minutes', ui.value));
            drawCron();
        }
    });

    $('#cron-tabs-hour .cron-slider').slider({
        min: 1,
        max: 23,
        slide: function( event, ui ) {
            cronArr[2] = '*/' + ui.value;
            $('#cron-tabs-hour-n .cron-preview').html(_('Every %s hours', ui.value));
            drawCron();
        }
    });

    function drawEachMinutes () {
        // minutes
        for (var i = 0; i < 60; i++) {
            var padded = i;
            if(padded.toString().length === 1) {
                padded = '0' + padded;
            }
            $('.cron-tabs-minute-format').append('<input type="checkbox" id="cron-minute-check' + i + '"><label for="cron-minute-check' + i + '">' + padded + '</label>');
            if (i !== 0 && (i + 1) % 10 === 0) {
                $('.cron-tabs-minute-format').append('<br/>');
            }
        }
        $('.cron-tabs-minute-format input').button();
        $('.cron-tabs-minute-format').buttonset();

        $('.cron-tabs-minute-format input[type="checkbox"]').click(function(){
            var newItem = $(this).attr('id').replace('cron-minute-check', '');
            if(cronArr[1] === '*') {
                cronArr[1] = $(this).attr('id').replace('cron-minute-check', '');
            } else {

                // if value already in list, toggle it off
                var list = cronArr[1].split(',');
                if (list.indexOf(newItem) !== -1) {
                    list.splice(list.indexOf(newItem), 1);
                    cronArr[1] = list.join(',');
                } else {
                    // else toggle it on
                    cronArr[1] = cronArr[1] + ',' + newItem;
                }
                if(cronArr[1] === '') cronArr[1] = '*';
            }
            drawCron();
        });
    }
    
    function drawEachHours () {
        // hours
        for (var i = 0; i < 24; i++) {
            var padded = i;
            if (padded.toString().length === 1) {
                padded = '0' + padded;
            }
            $('.cron-tabs-hour-format').append('<input type="checkbox" id="cron-hour-check' + i + '"><label for="cron-hour-check' + i + '">' + padded + '</label>');
            if (i !== 0 && (i + 1) % 12 === 0) {
                $('.cron-tabs-hour-format').append('<br/>');
            }
        }

        $('.cron-tabs-hour-format input').button();
        $('.cron-tabs-hour-format').buttonset();

        $('.cron-tabs-hour-format input[type="checkbox"]').click(function(){
            var newItem = $(this).attr('id').replace('cron-hour-check', '');
            if(cronArr[2] === '*') {
                cronArr[2] = $(this).attr('id').replace('cron-hour-check', '');
            } else {
                // if value already in list, toggle it off
                var list = cronArr[2].split(',');
                if (list.indexOf(newItem) !== -1) {
                    list.splice(list.indexOf(newItem), 1);
                    cronArr[2] = list.join(',');
                } else {
                    // else toggle it on
                    cronArr[2] = cronArr[2] + ',' + newItem;
                }
                if(cronArr[2] === '') cronArr[2] = '*';
            }
            drawCron();
        });

    }

    function drawEachDays () {
        // days
        for (var i = 1; i < 32; i++) {
            var padded = i;
            if(padded.toString().length === 1) {
                padded = '0' + padded;
            }
            $('.cron-tabs-day-format').append('<input type="checkbox" id="cron-day-check' + i + '"><label for="cron-day-check' + i + '">' + padded + '</label>');
            if (i !== 0 && (i) % 7 === 0) {
                $('.cron-tabs-day-format').append('<br/>');
            }
        }

        $('.cron-tabs-day-format input').button();
        $('.cron-tabs-day-format').buttonset();

        $('.cron-tabs-day-format input[type="checkbox"]').click(function(){
            var newItem = $(this).attr('id').replace('cron-day-check', '');
            if(cronArr[3] === '*') {
                cronArr[3] = $(this).attr('id').replace('cron-day-check', '');
            } else {

                // if value already in list, toggle it off
                var list = cronArr[3].split(',');
                if (list.indexOf(newItem) !== -1) {
                    list.splice(list.indexOf(newItem), 1);
                    cronArr[3] = list.join(',');
                } else {
                    // else toggle it on
                    cronArr[3] = cronArr[3] + ',' + newItem;
                }
                if(cronArr[3] === '') cronArr[3] = '*';
            }
            drawCron();
        });
    }
    
    function drawEachMonths () {
        // months
        var months = [null, 'Jan', 'Feb', 'March', 'April', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

        for (var i = 1; i < 13; i++) {
            var padded = i;
            if(padded.toString().length === 1) {
                //padded = '0' + padded;
            }
            $('.cron-tabs-month-format').append('<input type="checkbox" id="cron-month-check' + i + '"><label for="cron-month-check' + i + '">' + _(months[i]) + '</label>');
        }

        $('.cron-tabs-month-format input').button();
        $('.cron-tabs-month-format').buttonset();


        $('.cron-tabs-month-format input[type="checkbox"]').click(function(){
            var newItem = $(this).attr('id').replace('cron-month-check', '');
            if(cronArr[4] === '*') {
                cronArr[4] = $(this).attr('id').replace('cron-month-check', '');
            } else {
                // if value already in list, toggle it off
                var list = cronArr[4].split(',');
                if (list.indexOf(newItem) !== -1) {
                    list.splice(list.indexOf(newItem), 1);
                    cronArr[4] = list.join(',');
                } else {
                    // else toggle it on
                    cronArr[4] = cronArr[4] + ',' + newItem;
                }
                if(cronArr[4] === '') {
                    cronArr[4] = '*';
                }

            }
            drawCron();
        });
    }

    function drawEachWeek () {
        // weeks
        var days = [
            {id: 1, name: 'Monday'},
            {id: 2, name: 'Tuesday'},
            {id: 3, name: 'Wednesday'},
            {id: 4, name: 'Thursday'},
            {id: 5, name: 'Friday'},
            {id: 6, name: 'Saturday'},
            {id: 0, name: 'Sunday'}
        ];

        for (var i = 0; i < 7; i++) {
            var padded = i;
            if(padded.toString().length === 1) {
                //padded = '0' + padded;
            }

            $('.cron-tabs-week-format').append('<input type="checkbox" id="cron-week-check' + days[i].id + '"><label for="cron-week-check' + i + '">' + _(days[i].name) + '</label>');
        }

        $('.cron-tabs-week-format input').button();
        $('.cron-tabs-week-format').buttonset();

        $('.cron-tabs-week-format input[type="checkbox"]').click(function(){
            var newItem = $(this).attr('id').replace('cron-week-check', '');
            if(cronArr[5] === '*') {
                cronArr[5] = $(this).attr('id').replace('cron-week-check', '');
            } else {
                // if value already in list, toggle it off
                var list = cronArr[5].split(',');
                if (list.indexOf(newItem) !== -1) {
                    list.splice(list.indexOf(newItem), 1);
                    cronArr[5] = list.join(',');
                } else {
                    // else toggle it on
                    cronArr[5] = cronArr[5] + ',' + newItem;
                }
                if(cronArr[5] === '') cronArr[5] = '*';
            }
            drawCron();
        });
    }

    drawEachMinutes();
    drawEachHours();
    drawEachDays();
    drawEachMonths();
    drawCron();
};

// HTML Template for plugin
var tmpl = '<input type="text" id="cron-input" value="* * * * * *" size="80"/>\
<br/>\
<div id="cron_tabs" class="cron-tabs">\
  <ul>\
    <li><a href="#cron-tabs-second"  class="translate">Second</a></li>\
    <li><a href="#cron-tabs-minute"  class="translate">Minute</a></li>\
    <li><a href="#cron-tabs-hour"    class="translate">Hour</a></li>\
    <li><a href="#cron-tabs-day"     class="translate">Day of Month</a></li>\
    <li><a href="#cron-tabs-month"   class="translate">Month</a></li>\
    <li><a href="#cron-tabs-week"    class="translate">Day of Week</a></li>\
  </ul>\
  <div id="cron-tabs-second" class="cron-tab-page">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-second-every"><a href="#cron-tabs-second-every" class="translate">Every second</a></li>\
        <li id="cron-button-second-n"><a href="#cron-tabs-second-n" class="translate">Every n seconds</a></li>\
      </ul>\
      <div id="cron-tabs-second-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">Every second.</div>\
      </div>\
      <div id="cron-tabs-second-n">\
        <div class="cron-preview translate">Every 1 seconds</div>\
        <div class="cron-slider"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-minute" class="cron-tab-page">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-minute-every"><a href="#cron-tabs-minute-every" class="translate">Every Minute</a></li>\
        <li id="cron-button-minute-n"><a href="#cron-tabs-minute-n" class="translate">Every n minutes</a></li>\
        <li id="cron-button-minute-each"><a href="#cron-tabs-minute-each" class="translate">Each Selected Minute</a></li>\
      </ul>\
      <div id="cron-tabs-minute-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">Every minute.</div>\
      </div>\
      <div id="cron-tabs-minute-n">\
        <div class="cron-preview" class="translate">Every 1 minutes</div>\
        <div class="cron-slider"></div>\
      </div>\
      <div id="cron-tabs-minute-each" class="preview">\
        <div class="translate">Each selected minute</div><br/>\
        <div class="cron-tabs-minute-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-hour" class="cron-tab-page">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-hour-every"><a href="#cron-tabs-hour-every" class="translate">Every Hour</a></li>\
        <li id="cron-button-hour-n"><a href="#cron-tabs-hour-n" class="translate">Every n Hours</a></li>\
        <li id="cron-button-hour-each"><a href="#cron-tabs-hour-each" class="translate">Each Selected Hour</a></li>\
      </ul>\
      <div id="cron-tabs-hour-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">Every hour</div>\
      </div>\
      <div id="cron-tabs-hour-n">\
        <div class="cron-preview" class="translate">Every 1 hours</div>\
        <div class="cron-slider"></div>\
      </div>\
      <div id="cron-tabs-hour-each" class="cron-preview">\
        <div class="translate">Each selected hour</div><br/>\
        <div class="cron-tabs-hour-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-day" class="cron-tab-page">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-day-every"><a href="#cron-tabs-day-every" class="translate">Every Day</a></li>\
        <li id="cron-button-day-each"><a href="#cron-tabs-day-each" class="translate">Each Day</a></li>\
      </ul>\
      <div id="cron-tabs-day-every" class="cron-preview">\
        <div>*</div>\
        <div class="translate">Every Day</div>\
      </div>\
      <div id="cron-tabs-day-each" class="preview">\
        <div class="translate">Each selected Day</div><br/>\
        <div class="cron-tabs-day-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-month" class="cron-tab-page">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-month-every"><a href="#cron-tabs-month-every" class="translate">Every Month</a></li>\
        <li id="cron-button-month-each"><a href="#cron-tabs-month-each" class="translate">Each Month</a></li>\
      </ul>\
      <div id="cron-tabs-month-every" class="preview">\
        <div>*</div>\
        <div class="translate">Every month</div>\
      </div>\
      <div id="cron-tabs-month-each" class="preview">\
        <div class="translate">Each selected month</div><br/>\
        <div class="cron-tabs-month-format"></div>\
      </div>\
    </div>\
  </div>\
  <div id="cron-tabs-week" class="cron-tab-page">\
    <div class="cron-tabs">\
      <ul>\
        <li id="cron-button-week-every"><a href="#cron-tabs-week-every" class="translate">Every Week</a></li>\
        <li id="cron-button-week-each"><a href="#cron-tabs-week-each" class="translate">Each Week</a></li>\
      </ul>\
      <div id="cron-tabs-week-every" class="preview">\
        <div>*</div>\
        <div class="translate">Every Day</div>\
      </div>\
      <div id="cron-tabs-week-each">\
        <div class="cron-preview" class="translate">Each selected Day</div><br/>\
        <div class="cron-tabs-week-format"></div>\
      </div>\
    </div>\
  </div>\
</div>';