
module.exports = function setupStripeRoutes(namm){
    var app = namm.app;
    var mongoose = require("mongoose");
    var stripeOptions = namm.stripeOptions;
    var isAuthenticated = namm.isAuthenticated;

    var userSchema = mongoose.model('User');
    var stripeCustomer = require('./framework/payments//stripeCustomer');
    userSchema.plugin(stripeCustomer, stripeOptions);
    var setupStripe = require('./framework/payments/setupStripe');
    app.post('/billing/updateBilling', isAuthenticated, setupStripe.postBilling);
    app.post('/billing/updatePlan', isAuthenticated, setupStripe.postPlan);
}