var mongoose = require('mongoose'); var Schema = mongoose.Schema;
var _ = require("underscore");

var namm = require('./namm');

namm.require("./models")
  //.stripe(require('./stripeOptions'))
  .share({plans: require('./stripeOptions').planData})
  .routes('./routes')
  .connectors('./connectors')
  .init();
