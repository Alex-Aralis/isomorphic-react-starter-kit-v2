import 'source-map-support/register';
import 'babel-polyfill';

import app from './app';
import { log } from 'utilities';
import { PORT } from 'server/config';
import db from 'server/db';

db.once('open', () => {
  var server = app.listen(PORT, function () {
    var host = server.address().address;
    var port = server.address().port;

    log('Listening at http://%s:%s', host, port);
  });
});
