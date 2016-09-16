//##################################################################
//## UTILITY FUNCTION TO SEE IF USER IS AUTHENTICATED
//##################################################################

// As with any middleware it is quintessential to call next()
// if the user is authenticated

module.exports = function(namm){

    this.isAuthenticated = function isAuthenticated(req, res, next) {
        if (req.isAuthenticated()){
            return next();
        }
        res.redirect('/');
    }

    namm.isAuthenticated = isAuthenticated;

    return {
        isAuthenticated: isAuthenticated
    }
}