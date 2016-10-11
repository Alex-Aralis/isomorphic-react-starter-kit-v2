import { SERVER_ROOT, DB_URI } from 'server/config';
import express from 'express';
import React from 'react';
import Router, { RouterContext, match } from  'react-router';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import reducer from 'reducers';
import { item } from 'actions';
import { log } from 'utilities';

// initialize mongoose - mongodb connection
import mongoose from 'mongoose';

log(DB_URI);
//mongoose.connect(DB_URI);

const app = express();

app.set('views', './views');
app.set('view engine', 'jade');

import routes from '../routes';

app.get('/js/app.js', (req, res) => {
  res.sendFile(SERVER_ROOT + '/app.js');
});

app.get('/*', async (req, res) => {
  match({ routes, location: req.url },
    (err, redirectLocation, renderProps) => {
      if (err) {
        log(err);
        res.status(500).json({ message: 'internal server error' });
      } else if (redirectLocation){
        res.redirect(302, redirectLocation.pathname + redirectLocation.search);

      } else if (renderProps){
        const store = createStore(reducer);

        store.dispatch(item.append('hi from the server'));

        const appRoot = (
          <Provider store={ store }>
            <RouterContext { ...renderProps } />
          </Provider>
        );

        const reactOutput = renderToString(appRoot);
        const initialReduxStateJSON = JSON.stringify(store.getState());

        res.render('index', { reactOutput, initialReduxStateJSON });

      } else {
        res.status(404).json({ message: 'page not found' });

      }
    })
});

export default app;
