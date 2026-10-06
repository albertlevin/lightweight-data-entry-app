<template>
  <div id="app">
    <!-- Replace the placeholders with the IDs of your own Power BI report. -->
    <iframe
      title="demo_report"
      width="100%"
      height="100%"
      src="https://app.powerbi.com/reportEmbed?reportId=YOUR_REPORT_ID&autoAuth=true&ctid=YOUR_TENANT_ID"
      frameborder="0"
    ></iframe>
  </div>
</template>
/* width="1140" height="541.25" */

<script>
export default {
  name: "PowerBI",
  data() {
    return {
      reportId: "YOUR_REPORT_ID",
    };
  },
};
</script>

<style>
#app {
  width: 100%;
  position: relative;
  padding-bottom: calc(100% / 2.11);
}

/*
#iframeContainer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
*/

iframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
