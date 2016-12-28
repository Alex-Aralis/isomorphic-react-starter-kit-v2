import { Router } from 'express';
const router = Router();

import React from 'react';
import { RouterContext, match } from  'react-router';
import { renderToString } from 'react-dom/server';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import reducer from 'common/redux/reducers';
import { item } from 'common/redux/actions';
import { log } from 'utilities';
import { reactErrLink } from 'server/utilities';
import routes from 'common/routes';

router.get('/*', reactErrLink(async (req, res, next) => {
  match({ routes, location: req.url },
    (err, redirectLocation, renderProps) => {
      if (err) {
				next(err);
        // res.status(500).json({ message: 'internal server error' });
      } else if (redirectLocation){
        res.redirect(302, redirectLocation.pathname + redirectLocation.search);

      } else if (renderProps){
        const store = createStore(
					reducer,
					applyMiddleware(thunk),
				);

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
}));

export default router;
