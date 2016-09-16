module.exports = function setupSockets(server, exports){
    var connections = exports.socketConnections;
    var sockjs = require('sockjs');
    var chat = sockjs.createServer();
    var mongoose = require("mongoose");
    var _ = require("underscore");

    chat.on('connection', function(conn) {
        connections.push(conn);
        var number = connections.length;
        var userId = null;
        var userName = null;
        console.log('USER CONNECTED: ' + number);
        conn.write(JSON.stringify({youruserid: number, text:"Welcome, User " + number}));

        conn.on('data', function(message) {
            var msg = _.extend({_user: number}, JSON.parse(message));

            console.log("USER " + number + ":");
            console.log(msg);

            if(msg.associateIds){
                msg.message = "USER CONNECTED: " + msg.userId + " (" + msg.name + ")" ;
                msg.connect = true;
                msg._user = number;
                msg.userId = msg.userId;
                msg.name = msg.name;
                msg.userName = "[SYSTEM]";

                console.log( ('user associated: ' + msg.userIndex + ' -> ' + msg.userId).green );
                userId = msg.userId;
                userName = msg.name;
                conn.userId = userId;

                var User =  mongoose.model('User');
                User.findOneAndUpdate({ _id: userId }, { $set: { status: 'available', statusUpdated: new Date() }}, {new:true}).exec(function(err, res){
                    console.log(err || ("user status updated (" + res.status + ")").yellow);
                });
            }

            if(msg.message){
                var sendToAll = !msg._target || !msg._target.length || msg._target == '*';

                for (var ii=0; ii < connections.length; ii++) {
                    if(sendToAll || msg._user == (ii+1) || msg._target == (ii+1).toString()){
                        connections[ii].write(JSON.stringify(msg));
                    }
                }
            }
        });

        conn.on('close', function() {
            var userHasOpenConnections = false;
            conn.closed = true;
            connections.forEach(function(c){
                //console.log(c);
                if(c.userId == userId && !c.closed){
                    userHasOpenConnections = true;
                }
            });

            if(!userHasOpenConnections){
                console.log( ("USER DCED: " + number + " (" + userId + ")").red );

                if(userId){
                    var User =  mongoose.model('User');
                    User.findOneAndUpdate({ _id: userId }, { $set: { status: 'offline', statusUpdated: new Date() }}, {new:true}).exec(function(err, res){
                        console.log(err || ("user status updated (" + res.status + ")").yellow);
                    });
                }

            }
            for (var ii=0; ii < connections.length; ii++) {
                connections[ii].write(JSON.stringify({_user: number, userName:"[SYSTEM]", userId:userId, disconnect:true, text:"User " + number + " has disconnected", message:"User " + userName + " has disconnected"}));
            }
        });
    });
    chat.installHandlers(server, {prefix:'/activity'});
}
