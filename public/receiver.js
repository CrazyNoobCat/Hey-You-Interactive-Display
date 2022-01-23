const context = cast.framework.CastReceiverContext.getInstance();
const playerManager = context.getPlayerManager();
const settings = new cast.framework.CastReceiverOptions();

//const castDebugLogger = cast.debug.CastDebugLogger.getInstance();

/*castDebugLogger.loggerLevelByEvents = {
    'cast.framework.events.category.CORE': cast.framework.LoggerLevel.INFO,
    'cast.framework.events.EventType.MEDIA_STATUS': cast.framework.LoggerLevel.DEBUG
  }*/

// Enable debug logger and show a 'DEBUG MODE' overlay at top left corner.
//castDebugLogger.setEnabled(true);

// Show debug overlay
//castDebugLogger.showDebugLogs(true);

//castDebugLogger.debug('before',settings.disableIdleTimeout);


settings.disableIdleTimeout = true;

//castDebugLogger.debug('after',settings.disableIdleTimeout)

context.start(settings);