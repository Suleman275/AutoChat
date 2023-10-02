const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const cookieParser = require('cookie-parser');
const { requireAuth, checkUser } = require('./middleware/authMiddleware');
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: "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",
});

const openai = new OpenAIApi(configuration);

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const Bot = require("./models/Bot");

const app = express();
const bots = {}
let currentBot;

async function getGPTResponse(clientID, prompt) {
  const bot = await Bot.findOne({clientID})
  console.log("Sending Message to bot: " + prompt)
  const completion = await openai.createCompletion({
    model: bot.modelConfig,
    prompt: bot.personalityConfig + prompt,
    max_tokens: bot.tokenConfig,
    temperature: bot.tempConfig,
  })
  return completion.data.choices[0].text
}

// middleware
app.use(express.static('public'));
app.use(express.json());
app.use(cookieParser());

// view engine
app.set('view engine', 'ejs');

// database connection
const dbURI = 'mongodb://localhost:27017/autochater';
mongoose.connect(dbURI)
  .then((result) => {
      console.log("DB has been connected")
      app.listen(3000, () => {
         console.log("Server is now running on port 3000")
      })})
  .catch((err) => console.log(err));

// routes
app.get('*', checkUser);
app.get('/', (req, res) => res.render('home', { title: "Home" }));

app.get('/dashboard', requireAuth, async (req, res) => {
  // Object.values(bots).forEach(bot => {
  //   bot.initialize()
  // });
  let botss = await Bot.findByOwner(res.locals.user.email)
  res.render('dashboard', { title: "dashboard", bots: botss })
});

app.get('/newbot', (req, res) => {
  res.render("newbot", {title: "New Bot"})
})

app.post('/newbot', checkUser, (req, res) => {
  const name = req.body.name
  let data = {}
  console.log(`Recieved name: ${name}`)
  
  // bots[name] = new Client({
  //   authStrategy: new LocalAuth()
  // });

  bots[name] = new Client();

  bots[name].on('qr', qr => {
    // qrcode.generate(qr, {small: true});
    data.code = qr
    res.json(data)
  });

  bots[name].initialize();

  bots[name].on('message', message => {
    if(message.body === '!ping') {
      message.reply('pong');
    }
    else{
      getGPTResponse(bots[name].info.wid.user, message.body).then(result => {
        console.log("Reply from bot is: " + result.trim())
        message.reply(result.trim())
      })
    }
  })

  bots[name].on('ready', () => {
    console.log('Client is ready!');
    user = res.locals.user
    try {
      const newbot = Bot.create({clientID: bots[name].info.wid.user, name, owner: user.email})
    } catch (error) {
      console.log(error)
    }

    // res.redirect('/dashboard')
  });
})

app.get('/bots/:id', async (req, res) => {
  const clientID = req.params.id
  currentBot = await Bot.findOne({clientID})
  console.log(currentBot)
  
  res.render('editconfig.ejs', {title: "Edit Bot Config", bot: currentBot})
})

app.post('/bots/:id', async (req, res) => {
  const clientID = req.params.id
  currentBot = await Bot.findOne({clientID})
  console.log(currentBot)

  const output = await currentBot.updateOne(req.body)
  console.log(output)

  currentBot = await Bot.findOne({clientID})
  console.log(currentBot)

  res.json({msg: "Bot updated"})
})

app.post('/deletebot/:id', async (req, res) => {
  //TODO:
})

app.use(authRoutes);