var mongoose = require('mongoose');

 exports.postBilling = function(req, res, next){
    var User = mongoose.model('User');
    var stripeToken = req.body.stripeToken;

    if(!stripeToken){
        return res.send( { msg: 'Please provide a valid card.' });

    }

    User.findById(req.user.id, function(err, user) {
        if (err) return next(err);

        user.setCard(stripeToken, function (err) {
            if (err) {
                if(err.code && err.code == 'card_declined'){
                    return res.send( { msg: 'Your card was declined. Please provide a valid card.' });
                }
                return res.send( { msg: 'An unexpected error occurred.' });

            }
            return res.send( { msg: 'Billing has been updated.' });

        });
    });
};

exports.postPlan = function(req, res, next){
    var User = mongoose.model('User');
    var plan = req.body.plan;
    var stripeToken = null;

    if(plan){
        plan = plan.toLowerCase();
    }

    if(req.user.stripe.plan == plan){
        return res.send( {msg: 'The selected plan is the same as the current plan.'});
    }

    if(req.body.stripeToken){
        stripeToken = req.body.stripeToken;
    }

    if(!req.user.stripe.last4 && !req.body.stripeToken){
        return res.send( {msg: 'Please add a card to your account before choosing a plan.'});
    }

    User.findById(req.user.id, function(err, user) {
        if (err) return next(err);

        user.setPlan(plan, stripeToken, function (err) {
            var msg;

            if (err) {
                if(err.code && err.code == 'card_declined'){
                    msg = 'Your card was declined. Please provide a valid card.';
                } else if(err && err.message) {
                    msg = err.message;
                } else {
                    msg = 'An unexpected error occurred.';
                }

                return res.send( { msg:  msg});
            }
            return res.send( { msg: 'Plan has been updated.' });
        });
    });
};