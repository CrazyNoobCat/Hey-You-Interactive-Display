//const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

/*castDebugLogger.loggerLevelByEvents = {
    'cast.framework.events.category.CORE': cast.framework.LoggerLevel.INFO,
    'cast.framework.events.EventType.MEDIA_STATUS': cast.framework.LoggerLevel.DEBUG
  }*/

// Enable debug logger and show a 'DEBUG MODE' overlay at top left corner.
//castDebugLogger.setEnabled(true);

// Show debug overlay
//castDebugLogger.showDebugLogs(true);

//castDebugLogger.debug('before',chromecastSettings.disableIdleTimeout);

//castDebugLogger.debug('useragent',ua);


// Based on:
//  https://modernweb.com/using-media-queries-in-javascript/
//var mq = window.matchMedia('@media tv');

var ua = navigator.userAgent;

if(ua.includes("CrKey")) {
    const chromecastContext = cast.framework.CastReceiverContext.getInstance(); 
    const chromecastSettings = new cast.framework.CastReceiverOptions();

    chromecastSettings.disableIdleTimeout = true;
    
    chromecastContext.start(chromecastSettings);

} else {
    console.log("UserAgent doesn't containt CrKey' so skipping ChromeCast Reciever start()")
}

