class Connection
{
    timeoutLimit;

    // # before a variable here indicates private

    // Analytics variables
    #lastActivity;
    #currentActivity;
    #initalConnectionTime;
    

    // Connection variables
    #io;
    #socket;
    #room;
    ready = true;

    // Only used for displays
    #host = false;
    #messages = []; // All messages which the display hasn't recieved due to it not being ready 
    numOfClients = 0;
    #shortName = null;
    failedConsecutiveHeartBeat = 0;
    
    // Only used for clients
    #lastInteractionTime;
    
    constructor(io, socket, activity, timeoutLimit) {
	    this.#io              = io;
        this.#socket          = socket;
        this.#currentActivity = activity; // Connection class itself;
	    this.timeoutLimit     = timeoutLimit;
	
        this.#room = socket.handshake.query.roomID;

        this.#initalConnectionTime = Date.parse(socket.handshake.time);
        this.updateLastInteractionTime();
    }

    //

    timedOut(){
        if (Date.now() - this.#lastInteractionTime > this.timeoutLimit)
            return true;
        else
            return false;        
    }

    // Setters
    activityChange(activity){
        this.ready = false; // Allows time for the ready status to be set to true and enables saving of messages.   
        this.#lastActivity = this.#currentActivity;
        this.#currentActivity = activity;
        this.messageRoom('reload');
    }
    setNewSocket(socket){
        this.#socket = socket;
        this.#lastInteractionTime = Date.now();
    } // Occurs on connection change or region
    setRoom(room){
        // Should probably have some logic for removing from the old room
        this.#room = room;
    }
    setAsRoomHost(){this.#host = true;}

    removeAsRoomHost(){this.#host = false;}
    
    updateLastInteractionTime(){
        this.#lastInteractionTime = Date.now();
        this.message('extendRoom', 1);// Informs the socket to extend it's cookie validty by one minue
    }

    addMessage(...args){

        this.#messages.push([...args]);
    }
    
    clearMessages(){this.#messages = []};

    setShortName(name){
        this.#shortName = name;
        this.setCookie('roomName',name,this.timeoutLimit); // mins => 1 year
    };

    setCookie(cName, cContent, cDurationMins){
        this.message('setNewCookie', cName, cContent, cDurationMins);
    }


    // Getters

    getDeviceID(){return this.#socket.handshake.query.clientID;}
    getSocketID(){return this.#socket.id;}
    getType(){return this.#socket.handshake.query.data;}
    getCurrentActivity(){return this.#currentActivity;} // Should I be treating this as another connection class?? Or should I have its own class for activities or displays?
    getLastActivity(){return this.#lastActivity;}
    getInitalConnection(){return this.#initalConnectionTime;}
    getLastInteraction(){return this.#lastInteractionTime;}
    getRoom(){return this.#room;}
    isRoomHost(){return this.#host;}
    getMessages(){return this.#messages;}
    getShortName(){return this.#shortName;}

    // Debug information

    connectionInformation(){
        var debugText = "DeviceID: " + this.getDeviceID() + "\tRoom ID: " + this.getRoom();
        return debugText;
    }

    // Functions
    message(...args){ // Handles sending socket updates to device
        if(this.ready){
            console.log("Message sent to: " + this.getDeviceID() + "\tArgs: " + args);
            this.#io.to(this.getSocketID()).emit(...args);
        } else {
            // When device is not ready save the messages to it
            this.addMessage(...args);
        }   
    }   

    messageRoom(...args){
        this.#io.to(this.getRoom()).emit(...args);
    }

}

module.exports = Connection;
