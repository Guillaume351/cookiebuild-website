<template>
  <div class="homepage">
    <div class="hero">
      <h1>Cookie Build</h1>
      <p class="tagline">The Ultimate Minecraft Mini-Games Experience</p>
      <div class="server-info">
        <p class="ip">play.cookie-build.com</p>
        <button @click="copyIP" class="copy-button">Copy IP</button>
      </div>
      <button class="cta-button">Play Now</button>
    </div>
    <div class="features">
      <div class="feature">
        <img src="/unique-games-icon.svg" alt="Unique Games" />
        <p>Unique Games</p>
      </div>
      <div class="feature">
        <img src="/community-icon.svg" alt="Vibrant Community" />
        <p>Vibrant Community</p>
      </div>
      <div class="feature">
        <img src="/java-support-icon.svg" alt="Java Support" />
        <p>Java Support</p>
      </div>
    </div>
    <button @click="contactSupport" class="support-button">
      Contact Support
    </button>
  </div>
</template>

<script setup>
const copyIP = () => {
  navigator.clipboard.writeText("play.cookie-build.com");
  alert("IP address copied to clipboard!");
};

const contactSupport = () => {
  window.location.href = "mailto:support@cookie-build.com";
};
</script>

<style scoped>
.homepage {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: "Arial", sans-serif;
}

.hero {
  text-align: center;
  padding: 80px 0;
  background: linear-gradient(rgba(62, 44, 44, 0.7), rgba(62, 44, 44, 0.7)),
    url("/hero-bg.jpg") center/cover no-repeat;
  border-radius: 20px;
  margin-bottom: 60px;
}

.hero h1 {
  font-size: 5rem;
  color: #e0c097;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  margin-bottom: 20px;
}

.tagline {
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 30px;
}

.server-info {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
}

.ip {
  font-size: 1.2rem;
  color: #e0c097;
  background-color: rgba(97, 75, 58, 0.7);
  padding: 10px 20px;
  border-radius: 5px 0 0 5px;
}

.copy-button {
  background-color: #e0c097;
  color: #3e2c2c;
  border: none;
  padding: 10px 20px;
  font-size: 1rem;
  border-radius: 0 5px 5px 0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.copy-button:hover {
  background-color: #d1a978;
}

.cta-button {
  background-color: #e0c097;
  color: #3e2c2c;
  border: none;
  padding: 15px 40px;
  font-size: 1.2rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cta-button:hover {
  background-color: #d1a978;
}

.features {
  display: flex;
  justify-content: space-around;
  margin-bottom: 60px;
}

.feature {
  text-align: center;
}

.feature img {
  width: 80px;
  height: 80px;
  margin-bottom: 15px;
}

.feature p {
  color: #e0c097;
  font-size: 1.1rem;
}

.support-button {
  display: block;
  margin: 0 auto;
  background-color: #614b3a;
  color: #e0c097;
  border: none;
  padding: 12px 30px;
  font-size: 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.support-button:hover {
  background-color: #7a5f4a;
}
</style>
