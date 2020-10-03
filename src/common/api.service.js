import Vue from "vue";
import axios from "axios";
import VueAxios from "vue-axios";
import JwtService from "@/common/jwt.service";
// add a second QEWD_URL parameter for the WebSocket endpoint
import { API_URL, QEWD_URL } from "@/common/config";
// import the socket.io client into our App component
import io from 'socket.io-client'

const ApiService = {
  init() {
    Vue.use(VueAxios, axios);
    Vue.axios.defaults.baseURL = API_URL;
  },

  setHeader() {
    Vue.axios.defaults.headers.common[
      "Authorization"
    ] = `Token ${JwtService.getToken()}`;
  },

  query(resource, params) {
    return Vue.axios.get(resource, params).catch(error => {
      throw new Error(`[RWV] ApiService ${error}`);
    });
  },

  get(resource, slug = "") {
    return Vue.axios.get(`${resource}/${slug}`).catch(error => {
      throw new Error(`[RWV] ApiService ${error}`);
    });
  },

  post(resource, params) {
    return Vue.axios.post(`${resource}`, params);
  },

  update(resource, slug, params) {
    return Vue.axios.put(`${resource}/${slug}`, params);
  },

  put(resource, params) {
    return Vue.axios.put(`${resource}`, params);
  },

  delete(resource) {
    return Vue.axios.delete(resource).catch(error => {
      throw new Error(`[RWV] ApiService ${error}`);
    });
  }
};

export default ApiService;

// add a similar service wrapper object here for WebSocket communication
export const QEWDService = {
  _vcc: null,

  // initialise + start the WebSocket communication using qewd-client
  init(vcc) {
    // keep the Vue (App) component context
    this._vcc = vcc
    /*
      create an event handler invoked when QEWD's connection is registered/ready
    */
    vcc.$qewd.on('ewd-registered', function() {
      // Your QEWD environment is ready, set the qewdReady data property to true
      vcc.qewdReady = true
      // optionally turn on logging to the console
      vcc.$qewd.log = true
    });
    vcc.$qewd.on('ewd-reregistered', function() {
      // Your QEWD server is available again, set the qewdNotReachable data property to false
      vcc.qewdNotReachable = false
    });
    vcc.$qewd.on('socketDisconnected', function() {
      // Your QEWD server is not available, set the qewdNotReachable data property to true
      vcc.qewdNotReachable = true
    });
    /*
      start QEWD-Up/QEWD.js client with these required params:
      - application: QEWD's application name
      - io: the imported websocket client module
      - url: the url of your QEWD-Up/QEWD.js server

      *** important: by default, a Vue.js app will run it's development server on localhost:8080 
      (this is the same port as QEWD's default port 8080)
      you'll *need* to change the port to e.g. 8090 in QEWD's config
      to make it work with a Vue.js app!
    */
    vcc.$qewd.start({
      application: 'qewd-conduit',
      io,
      url: QEWD_URL
    })
  },

  // wrap the qewd-client reply() method of qewd-client to return a compatible response format with axios
  reply(messageObj) {
    let vcc = this._vcc
    return new Promise((resolve, reject) => {
      vcc.$qewd.send(messageObj, function(responseObj) {
        responseObj.data = responseObj.message ? responseObj.message : {}
        resolve(responseObj);
      });
    })
  }
}

/*
  we changed some of the vuex services to use WebSockets calls
  and commented out the original REST calls
  we let other services still REST calls to the same QEWD-Up/QEWD.js back-end
  because we can use both REST and WebSocket endpoints simultaneously!
  at the back-end, we can even (re)use the same code for both
  REST & WebSocket handlers using a small wrapper function
*/

export const TagsService = {
  get() {
    //return ApiService.get("tags");
    return QEWDService.reply({
      type: "getTags"
    })
  }
};

export const ArticlesService = {
  query(type, params) {
    /*
    return ApiService.query("articles" + (type === "feed" ? "/feed" : ""), {
      params: params
    });
    */
    return QEWDService.reply({
      type: (type === "feed") ? "getArticlesFeed" : "getArticlesList",
      query: params,
      JWT: JwtService.getToken()
    })
  },
  get(slug) {
    //return ApiService.get("articles", slug);
    return QEWDService.reply({
      type: "getArticleBySlug",
      params: {
        slug
      },
      JWT: JwtService.getToken()
    })
  },
  create(params) {
    //return ApiService.post("articles", { article: params });
    return QEWDService.reply({
      type: "createArticle",
      body: {
        article: params
      },
      JWT: JwtService.getToken()
    });
  },
  update(slug, params) {
    return ApiService.update("articles", slug, { article: params });
  },
  destroy(slug) {
    return ApiService.delete(`articles/${slug}`);
  }
};

export const CommentsService = {
  get(slug) {
    if (typeof slug !== "string") {
      throw new Error(
        "[RWV] CommentsService.get() article slug required to fetch comments"
      );
    }
    return ApiService.get("articles", `${slug}/comments`);
    /*
    return QEWDService.reply({
      type: "getComments",
      slug,
      JWT: JwtService.getToken()
    })
    */
  },

  post(slug, payload) {
    return ApiService.post(`articles/${slug}/comments`, {
      comment: { body: payload }
    });
  },

  destroy(slug, commentId) {
    return ApiService.delete(`articles/${slug}/comments/${commentId}`);
  }
};

export const FavoriteService = {
  add(slug) {
    return ApiService.post(`articles/${slug}/favorite`);
  },
  remove(slug) {
    return ApiService.delete(`articles/${slug}/favorite`);
  }
};
