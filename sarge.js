const _sarge = (() => {
  let id = null;
  let expiryDays = 28;
  let prod = true;

  const init = ([_id, _expiryDays, _prod]) => {
    id = _id;
    expiryDays = _expiryDays || 28;
    prod = _prod === undefined ? true : false;

    localStoreParams();
  };

  const _consol = (level, msg) => {
    const isProd = prod === true;
    if (!isProd) {
      console[level](msg);
    }
  };

  const consol = {
    log: (msg) => _consol("log", msg),
    warn: (msg) => _consol("warn", msg),
    error: (msg) => _consol("error", msg),
  };

  // params = "[{ name, value }]"
  const paramFormatter = (url, params = [{}]) => {
    url = new URL(url);
    // Build our URL
    if (params.length > 0) {
      for (let i = 0; i < params.length; i++) {
        const { name, value } = params[i];
        if (name && value) {
          url.searchParams.append(name, value);
        }
      }
    }

    return url.href;
  };

  // "[{ name, value }]", "log/whatever"
  const _net = ({ params = [{}], func }) => {
    const uri = prod
      ? "https://live.sarge.io/api/v1"
      : "http://localhost:49828";

    const url = paramFormatter(`${uri}/${func}`, [
      { name: "id", value: id },
      ...Object.keys(params).map((name) => ({ name, value: params[name] })),
    ]);

    new Image().src = url;
  };

  const net = {
    get: ({ func, params }) => _net({ params, func }),
    // post: ({ func, params, json }) =>
    //   _net({ method: "POST", params, json, func }),
  };

  const getDate = (addDays = 0) =>
    new Date(Date.now() + addDays * 24 * 60 * 60 * 1000);

  const _cookie = ({ method = "GET", name, value }) => {
    const _method = method.toUpperCase();

    // Set our expiry to be x days from now (FB captures up to 28d)
    const expiry = getDate(expiryDays);

    if (_method === "GET") {
      return (
        document.cookie &&
        document.cookie.length > 0 &&
        document.cookie
          .split("; ")
          .find((row) => row.startsWith(`${name}=`))
          .split("=")[1]
      );
    } else if (_method === "SET") {
      document.cookie = `${name}=${value}; expires=${expiry.toUTCString()}`;
    }
  };

  const cookie = {
    get: (name) => _cookie({ method: "GET", name }),
    set: (name, value) => _cookie({ method: "SET", name, value }),
  };

  const localStore = {
    get: (name) => window.localStorage.getItem(name),
    set: (name, value) => {
      window.localStorage.setItem(name, value);
    },
    remove: (name) => window.localStorage.removeItem(name),
  };

  // elm, [{name, value}]
  const _ctaAppend = (elm, params = [{}]) => {
    const href = paramFormatter(elm.href, params);
    elm.href = href;

    return elm;
  };

  const cta = {
    append: (query, params) => {
      const elm = document.querySelector(query);
      return _ctaAppend(elm, params);
    },
    appendAll: (query, params) => {
      const results = [];
      const elms = document.querySelectorAll(query);
      for (const elm of elms) {
        result.push(_ctaAppend(elm, params));
      }

      return results;
    },
  };

  // Grabs the sarge params from the URL and cookie them
  const cookieParams = () => {
    const params = new URLSearchParams(window.location.search);
    const sarge_ref = params.get("sarge_ref");
    const sarge_aff = params.get("sarge_aff");

    sarge_ref && cookie.set("sarge_ref", sarge_ref);
    sarge_aff && cookie.set("sarge_aff", sarge_aff);
  };

  // Grabs the sarge params from the URL and cookie them
  const localStoreParams = () => {
    let existingExp = localStore.get("sarge_exp");
    if (prod && existingExp) {
      existingExp = new Date(existingExp);
      // If our expiry date is in the future, count this as a latent and shouldn't overwrite our data
      if (existingExp > Date.now()) {
        return;
      }
    }

    const params = new URLSearchParams(window.location.search);
    const sarge_ref = params.get("sarge_ref");
    const sarge_aff = params.get("sarge_aff");

    sarge_ref && localStore.set("sarge_ref", sarge_ref);
    sarge_aff && localStore.set("sarge_aff", sarge_aff);
    (sarge_ref || sarge_aff) && localStore.set("sarge_exp", getDate(expiryDays));
  };

  const cleanLocalStores = () => {
    localStore.remove("sarge_ref");
    localStore.remove("sarge_aff");
    localStore.remove("sarge_exp");
  };

  const getLocalStores = () => {
    return {
      aff: localStore.get("sarge_aff"),
      ref: localStore.get("sarge_ref"),
      exp: localStore.get("sarge_exp"),
    };
  };

  const events = {
    pageView: (custom) => {
      const date = new Date().toDateString();
      return net.get({
        func: "pageView",
        params: { ...getLocalStores(), ...custom, date },
      });
    },
    atc: () => {
      const date = new Date().toDateString();
      return net.get({
        func: "atc",
        params: { ...getLocalStores(), ...custom, date },
      });
    },
    purchase: () => {
      const localStores = getLocalStores();

      // Remove local stores for next session
      cleanLocalStores();

      const date = new Date().toDateString();
      return net.get({
        func: "purchase",
        params: { ...localStores, ...custom, date },
      });
    },
  };

  return {
    init,
    events,
  };
})();

window._invoke = (args) => {
  const arr = Array.prototype.slice.call(args);
  const fn = _sarge[arr[0]];

  if (typeof fn === "function") {
    const params = arr.slice(1, arr.length);
    return fn(params);
  } else {
    const params = arr.slice(2, arr.length);
    return fn[arr[1]](params);
  }
};

for (const call of window._sarge.queue) {
  window._invoke(call);
}
