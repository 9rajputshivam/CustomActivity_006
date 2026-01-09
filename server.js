const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { DateTime } = require('luxon');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT;

/* --------------------------------------------------
   Middleware
-------------------------------------------------- */
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

/* --------------------------------------------------
   JWT Validation Middleware (Journey Builder Security)
-------------------------------------------------- */
function verifyJwt(req, res, next) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).send('Invalid JWT');
  }
}

/* --------------------------------------------------
   Dedupe Cache (prevents duplicate retries)
-------------------------------------------------- */
const executionCache = new Set();

/* --------------------------------------------------
   Time Window Logic
-------------------------------------------------- */
const countryTimezones = {
  india: 'Asia/Kolkata',
  germany: 'Europe/Berlin',
  usa: 'America/New_York',
  uk: 'Europe/London',
  slovakia: 'Europe/Bratislava'
};

function evaluateDaytimeWindow(countryName) {
  if (!countryName) return { isWithinWindow: false };

  const tz = countryTimezones[countryName.toLowerCase()];
  if (!tz) return { isWithinWindow: false };

  const nowLocal = DateTime.now().setZone(tz);
  const startHour = 9;
  const endHour = 18;

  return {
    isWithinWindow: nowLocal.hour >= startHour && nowLocal.hour < endHour,
    currentHour: nowLocal.hour
  };
}

/* --------------------------------------------------
   Health Check
-------------------------------------------------- */
app.get('/health', (req, res) => res.send('OK'));

/* --------------------------------------------------
   EXECUTE ENDPOINT
-------------------------------------------------- */
app.post('/activity/execute', verifyJwt, (req, res) => {
  const dedupeKey = req.body.activityId + ':' + req.body.definitionInstanceId;

  if (executionCache.has(dedupeKey)) {
    return res.sendStatus(200);
  }
  executionCache.add(dedupeKey);

  const inArgs = Object.assign({}, ...req.body.inArguments);
  const result = evaluateDaytimeWindow(inArgs.country);

  return res.status(200).json([
    {
      isWithinWindow: result.isWithinWindow,
      currentHour: result.currentHour
    }
  ]);
});

/* --------------------------------------------------
   LIFECYCLE ENDPOINTS
-------------------------------------------------- */
app.post('/activity/save', verifyJwt, (req, res) => res.sendStatus(200));
app.post('/activity/validate', verifyJwt, (req, res) => res.sendStatus(200));
app.post('/activity/publish', verifyJwt, (req, res) => res.sendStatus(200));
app.post('/activity/stop', verifyJwt, (req, res) => res.sendStatus(200));

/* --------------------------------------------------
   Start Server
-------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Custom Activity running on port ${PORT}`);
});
