const mongoose = require('mongoose');

const botSchema = mongoose.Schema({
   clientID: {
      type: String,
      required: true,
      unique: true,
   },
   owner: {
      type: String,
      required: true
   },
   name: {
      type: String,
      lowercase: true,
      unique: true,
   },
   modelConfig: {
      type: String
   },
   tokenConfig: {
      type: Number
   },
   tempConfig: {
      type: Number
   },
   personalityConfig: {
      type: String
   },
   client: {
      type: Object
   }
})

botSchema.pre('save', function(next){
   if(this.modelConfig == null) {
      this.modelConfig = "text-davinci-003"
   }
   if(this.tempConfig == null) {
      this.tempConfig = 0.6
   }
   if(this.personalityConfig == null) {
      this.personalityConfig = "You are a helpful assistant: "
   }
   if(this.tokenConfig == null) {
      this.tokenConfig = 200
   }
   next()
})

botSchema.post('save', function (doc, next) {
   console.log('new bot was created & saved', doc);
   next();
});


botSchema.statics.findByOwner = async function (email) {
   const bots = await this.find({owner: email})
   return bots
}

const Bot = mongoose.model('bot', botSchema);

module.exports = Bot;