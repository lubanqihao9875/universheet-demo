<template>
  <el-container style="height: 100vh;">
    <el-aside width="200px" style="background-color: #304156;">
      <el-menu default-active="/demoQuickStart" class="el-menu-vertical-demo" background-color="#304156" text-color="#fff"
        active-text-color="#ffd04b" router>
        <el-menu-item index="/demoQuickStart">
          <span>demoQuickStart</span>
        </el-menu-item>
        <el-menu-item index="/demoStandardUsage">
          <span>demoStandardUsage</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-main>
      <router-view></router-view>
    </el-main>
  </el-container>
</template>

<style lang="scss">
body {
  margin: 0;
}
.el-container {
  height: 100vh;
}
.el-main {
  padding: 20px;
  background-color: #f5f5f5;
}
.el-aside {
  height: 100vh;
}
.el-menu-vertical-demo {
  height: 100%;
}
</style>
