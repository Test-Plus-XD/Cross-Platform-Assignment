// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "AIzaSyCsVCZW7tF7ScW4e2SBdYtSQrl_GrK4zBk",
    authDomain: "cross-platform-assignmen-b97cc.firebaseapp.com",
    projectId: "cross-platform-assignmen-b97cc",
    storageBucket: "cross-platform-assignmen-b97cc.firebasestorage.app",
    messagingSenderId: "937491674619",
    appId: "1:937491674619:web:81eb1b44453eacdf3a475e",
    measurementId: "G-FQEV6WSNPC"
  },
  algoliaAppId: 'V9HMGL1VIZ',
  algoliaSearchKey: '563754aa2e02b4838af055fbf37f09b5',
  apiUrl: '',
  //apiUrl: 'https://vercel-express-api-alpha.vercel.app', // use proxy in dev
  placeholderImageUrl: 'https://firebasestorage.googleapis.com/v0/b/cross-platform-assignmen-b97cc.firebasestorage.app/o/Placeholder.jpg?alt=media&token=068887ee-1ac3-4107-a15a-210b268b5183',
  restaurantPlaceholderImages: [
    'https://firebasestorage.googleapis.com/v0/b/cross-platform-assignmen-b97cc.firebasestorage.app/o/Placeholder.jpg?alt=media&token=068887ee-1ac3-4107-a15a-210b268b5183',
    'https://firebasestorage.googleapis.com/v0/b/cross-platform-assignmen-b97cc.firebasestorage.app/o/sample_1.png?alt=media&token=41bc4513-e982-4dd1-a1ff-82c3b47fe77a',
    'https://firebasestorage.googleapis.com/v0/b/cross-platform-assignmen-b97cc.firebasestorage.app/o/sample_2.png?alt=media&token=a525c2b1-0609-4088-bf36-2dc44a1df3a1',
    'https://firebasestorage.googleapis.com/v0/b/cross-platform-assignmen-b97cc.firebasestorage.app/o/sample_3.png?alt=media&token=cd3147ee-b895-464f-a334-69d88c39ad12',
  ],
  //apiUrl: 'http://localhost:3000',
  socketUrl: 'https://railway-socket-production.up.railway.app/',
  fcmVapidKey: 'BEDBZEh6wzrgo0uI6SMui03I6IBJaurA-aFst3dLWC2hxuGhKjjWAXI9BlrQrbxNUgubkkxgOFJVacbpogSa7uc',
  googleMapsApiKey: 'AIzaSyAun6GtoyZqdkzO55Cbc5DHIO-xL2oYlRI',
  googleClientId: '937491674619-r1e5di42mi8tdgkqfhe2fubdms7jks9f.apps.googleusercontent.com'
};