<template>
  <div id="app">
    <RwvHeader v-if="qewdReady" />
    <router-view v-if="qewdReady"></router-view>
    <RwvFooter v-if="qewdReady" />
  </div>
</template>

<script>
import RwvHeader from "@/components/TheHeader";
import RwvFooter from "@/components/TheFooter";
// import QEWDService into our App component
import { QEWDService } from "@/common/api.service";

export default {
  name: "App",
  components: {
    RwvHeader,
    RwvFooter
  },
  data () {
    return {
      // define a reactive property set to true when QEWD's websocket is registered
      qewdReady: false,
      // define a reactive property set to true when QEWD's websocket becomes unavailable
      qewdNotReachable: false
    }
  },
  created () {
    // init the WebSocket connection to the QEWD-Up/QEWD.js back-end within the App context
    QEWDService.init(this)
  }
};
</script>

<style></style>
