class WeatherAnimation {
  constructor() {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.animationFrame = null;
    this.currentWeather = null;
    this.transitioningFrom = null;
    this.transitionProgress = 0;
    this.backgroundGradient = null;
    this.backgroundGradientTarget = null;

    // Set canvas properties
    this.canvas.id = "weather-canvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.zIndex = "0";

    // Default gradient
    this.backgroundGradient = {
      from: { r: 30, g: 60, b: 114 }, // #1e3c72
      to: { r: 42, g: 82, b: 152 }, // #2a5298
    };
    this.backgroundGradientTarget = { ...this.backgroundGradient };

    // Insert canvas as first element in body
    document.body.insertBefore(this.canvas, document.body.firstChild);

    // Handle resize
    window.addEventListener("resize", () => this.resizeCanvas());
    this.resizeCanvas();

    // Start basic animation
    this.animate();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  setWeather(weatherCode) {
    // Save previous weather for transition
    this.transitioningFrom = this.currentWeather;
    this.transitionProgress = 0;

    // Store new weather
    this.currentWeather = weatherCode;

    // Set target background gradient
    this.setBackgroundGradient(weatherCode);

    // Initialize particles based on weather
    this.clearParticles();

    switch (weatherCode.substring(0, 2)) {
      case "09": // Rain shower
      case "10": // Rain
        this.initRain(weatherCode.endsWith("d") ? "day" : "night");
        break;
      case "13": // Snow
        this.initSnow();
        break;
      case "11": // Thunderstorm
        this.initThunderstorm();
        break;
      case "01": // Clear
        this.initSunOrMoon(weatherCode.endsWith("d"));
        break;
      case "02": // Few clouds
        this.initSunOrMoonWithClouds(weatherCode.endsWith("d"));
        break;
      case "03": // Scattered clouds
      case "04": // Broken clouds
        this.initClouds(weatherCode.substring(0, 2) === "04");
        break;
      case "50": // Mist
        this.initMist();
        break;
    }
  }

  setBackgroundGradient(weatherCode) {
    const gradients = {
      // Clear day
      "01d": {
        from: { r: 255, g: 153, b: 102 }, // #FF9966
        to: { r: 255, g: 94, b: 98 }, // #FF5E62
      },
      // Clear night
      "01n": {
        from: { r: 32, g: 32, b: 44 }, // #20202C
        to: { r: 66, g: 66, b: 92 }, // #42425C
      },
      // Few clouds day
      "02d": {
        from: { r: 241, g: 196, b: 15 }, // #F1C40F
        to: { r: 243, g: 156, b: 18 }, // #F39C12
      },
      // Few clouds night
      "02n": {
        from: { r: 44, g: 62, b: 80 }, // #2C3E50
        to: { r: 52, g: 73, b: 94 }, // #34495E
      },
      // Scattered clouds
      "03d": {
        from: { r: 189, g: 195, b: 199 }, // #BDC3C7
        to: { r: 149, g: 165, b: 166 }, // #95A5A6
      },
      // Broken clouds
      "04d": {
        from: { r: 117, g: 127, b: 154 }, // #757F9A
        to: { r: 215, g: 221, b: 232 }, // #D7DDE8
      },
      // Rain day
      "10d": {
        from: { r: 0, g: 180, b: 219 }, // #00B4DB
        to: { r: 0, g: 131, b: 176 }, // #0083B0
      },
      // Rain night
      "10n": {
        from: { r: 25, g: 42, b: 86 }, // #192A56
        to: { r: 8, g: 24, b: 58 }, // #08183A
      },
      // Thunderstorm
      "11d": {
        from: { r: 40, g: 62, b: 81 }, // #283E51
        to: { r: 75, g: 121, b: 161 }, // #4B79A1
      },
      // Snow
      "13d": {
        from: { r: 227, g: 253, b: 245 }, // #E3FDF5
        to: { r: 255, g: 230, b: 250 }, // #FFE6FA
      },
      // Mist
      "50d": {
        from: { r: 48, g: 67, b: 82 }, // #304352
        to: { r: 215, g: 210, b: 204 }, // #d7d2cc
      },
    };

    // Get the base weather code (first 2 chars + day/night)
    const baseCode =
      weatherCode.substring(0, 2) + weatherCode.charAt(weatherCode.length - 1);

    // Use specific gradient or fallback to default
    const gradient = gradients[baseCode] ||
      gradients[weatherCode] || {
        from: { r: 30, g: 60, b: 114 }, // #1e3c72
        to: { r: 42, g: 82, b: 152 }, // #2a5298
      };

    this.backgroundGradientTarget = gradient;
  }

  clearParticles() {
    // Preserve particles for transition
    if (this.particles.length > 0) {
      // Mark existing particles for removal
      this.particles.forEach((p) => (p.removing = true));

      // Create new array for new particles
      this.newParticles = [];
    } else {
      this.particles = [];
      this.newParticles = [];
    }
  }

  initRain(timeOfDay) {
    const intensity = timeOfDay === "day" ? 100 : 70;
    for (let i = 0; i < intensity; i++) {
      this.newParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        length: Math.random() * 20 + 10,
        speed: Math.random() * 10 + 15,
        thickness: Math.random() * 2 + 1,
        opacity: 0, // Start transparent for transition
        targetOpacity: Math.random() * 0.4 + 0.1,
        type: "rain",
      });
    }
  }

  initSnow() {
    for (let i = 0; i < 200; i++) {
      this.newParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 3 + 1,
        speed: Math.random() * 3 + 1,
        wind: Math.random() * 2 - 1,
        opacity: 0, // Start transparent for transition
        targetOpacity: Math.random() * 0.5 + 0.5,
        type: "snow",
        wobble: Math.random() * 0.1 + 0.05,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
        wobbleAngle: Math.random() * Math.PI * 2,
      });
    }
  }

  initThunderstorm() {
    this.initRain("night");
    this.lastLightning = Date.now() - 4000;
    this.lightningFrequency = 5000; // ms between lightning

    // Add dark clouds for thunderstorm
    for (let i = 0; i < 12; i++) {
      this.newParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.3),
        width: Math.random() * 150 + 150,
        height: Math.random() * 80 + 60,
        speed: Math.random() * 0.3 + 0.1,
        opacity: 0, // Start transparent
        targetOpacity: Math.random() * 0.2 + 0.6, // Darker clouds
        type: "cloud",
        isDark: true,
      });
    }
  }

  initSunOrMoon(isDay) {
    const celestialBody = {
      x: this.width * 0.8,
      y: this.height * 0.2,
      radius: Math.min(this.width, this.height) * 0.08, // Responsive size
      rays: [],
      isDay,
      opacity: 0, // Start transparent
      targetOpacity: 1,
      type: "celestial",
    };

    if (isDay) {
      // Add sun rays
      for (let i = 0; i < 12; i++) {
        celestialBody.rays.push({
          angle: (i * Math.PI * 2) / 12,
          length: Math.random() * 30 + 20,
          width: Math.random() * 3 + 2,
        });
      }

      // Add a few light clouds for aesthetic
      for (let i = 0; i < 3; i++) {
        this.newParticles.push({
          x: Math.random() * this.width,
          y: Math.random() * (this.height * 0.3),
          width: Math.random() * 100 + 100,
          height: Math.random() * 60 + 40,
          speed: Math.random() * 0.2 + 0.05,
          opacity: 0,
          targetOpacity: Math.random() * 0.2 + 0.1,
          type: "cloud",
        });
      }
    } else {
      // Add stars for night sky
      for (let i = 0; i < 100; i++) {
        this.newParticles.push({
          x: Math.random() * this.width,
          y: Math.random() * (this.height * 0.7),
          radius: Math.random() * 1.5 + 0.5,
          opacity: 0,
          targetOpacity: Math.random() * 0.8 + 0.2,
          twinkleSpeed: Math.random() * 0.01 + 0.003,
          twinklePhase: Math.random() * Math.PI * 2,
          type: "star",
        });
      }
    }

    this.newParticles.push(celestialBody);
  }

  initSunOrMoonWithClouds(isDay) {
    // First add celestial body
    this.initSunOrMoon(isDay);

    // Then add more clouds
    for (let i = 0; i < 5; i++) {
      this.newParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.4),
        width: Math.random() * 120 + 100,
        height: Math.random() * 70 + 40,
        speed: Math.random() * 0.3 + 0.1,
        opacity: 0,
        targetOpacity: Math.random() * 0.3 + 0.3,
        type: "cloud",
      });
    }
  }

  initClouds(isHeavy = false) {
    const count = isHeavy ? 12 : 8;
    const opacityBase = isHeavy ? 0.4 : 0.3;
    const opacityRandom = isHeavy ? 0.4 : 0.3;

    for (let i = 0; i < count; i++) {
      this.newParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * (this.height * 0.5),
        width: Math.random() * 150 + 100,
        height: Math.random() * 70 + 50,
        speed: Math.random() * 0.5 + 0.1,
        opacity: 0, // Start transparent for transition
        targetOpacity: Math.random() * opacityRandom + opacityBase,
        type: "cloud",
      });
    }
  }

  initMist() {
    for (let i = 0; i < 20; i++) {
      this.newParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 150 + 100,
        opacity: 0, // Start transparent for transition
        targetOpacity: Math.random() * 0.3 + 0.05,
        speed: Math.random() * 0.3 + 0.1,
        type: "mist",
      });
    }
  }

  drawRain() {
    this.ctx.strokeStyle = "#FFFFFF";
    this.ctx.lineCap = "round";

    this.particles.forEach((drop) => {
      if (drop.type !== "rain") return;

      this.ctx.beginPath();
      this.ctx.moveTo(drop.x, drop.y);
      this.ctx.lineTo(
        drop.x + drop.length * Math.sin(Math.PI / 4),
        drop.y + drop.length * Math.cos(Math.PI / 4)
      );
      this.ctx.lineWidth = drop.thickness;
      this.ctx.globalAlpha = drop.opacity;
      this.ctx.stroke();

      drop.y += drop.speed;
      drop.x += drop.speed / 2;

      if (drop.y > this.height) {
        drop.y = -20;
        drop.x = Math.random() * this.width;
      }

      // Transition opacity
      if (drop.opacity < drop.targetOpacity && !drop.removing) {
        drop.opacity += 0.01;
      } else if (drop.removing) {
        drop.opacity -= 0.01;
        if (drop.opacity <= 0) {
          drop.remove = true;
        }
      }
    });
  }

  drawSnow() {
    this.ctx.fillStyle = "#FFFFFF";

    this.particles.forEach((flake) => {
      if (flake.type !== "snow") return;

      this.ctx.beginPath();
      this.ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      this.ctx.globalAlpha = flake.opacity;
      this.ctx.fill();

      // Update wobble angle
      flake.wobbleAngle += flake.wobbleSpeed;

      // Update position with wobble
      flake.y += flake.speed;
      flake.x += flake.wind + Math.sin(flake.wobbleAngle) * flake.wobble;

      if (flake.y > this.height) {
        flake.y = -10;
        flake.x = Math.random() * this.width;
      }

      // Transition opacity
      if (flake.opacity < flake.targetOpacity && !flake.removing) {
        flake.opacity += 0.01;
      } else if (flake.removing) {
        flake.opacity -= 0.01;
        if (flake.opacity <= 0) {
          flake.remove = true;
        }
      }
    });
  }

  drawThunderstorm() {
    this.drawRain();
    this.drawClouds();

    // Lightning effect
    const now = Date.now();
    if (now - this.lastLightning > this.lightningFrequency) {
      if (Math.random() < 0.4) {
        // 40% chance of lightning
        // Multiple flashes
        this.lightningFlash(0.9);

        setTimeout(() => this.lightningFlash(0.5), 50);
        setTimeout(() => this.lightningFlash(0.7), 150);

        this.lastLightning = now;
        // Random delay between 2-7 seconds
        this.lightningFrequency = Math.random() * 5000 + 2000;
      }
    }
  }

  lightningFlash(intensity) {
    if (!this.ctx) return;

    this.ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawSunOrMoon() {
    this.particles.forEach((p) => {
      if (p.type === "celestial") {
        this.ctx.globalAlpha = p.opacity;

        if (p.isDay) {
          // Draw sun glow
          const gradient = this.ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.radius * 3
          );
          gradient.addColorStop(0, "rgba(255, 255, 160, 0.8)");
          gradient.addColorStop(0.2, "rgba(255, 230, 110, 0.4)");
          gradient.addColorStop(1, "rgba(255, 255, 0, 0)");

          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
          this.ctx.fill();

          // Draw sun
          gradient.addColorStop(0, "rgba(255, 255, 190, 1)");
          gradient.addColorStop(0.8, "rgba(255, 210, 0, 1)");
          gradient.addColorStop(1, "rgba(255, 180, 0, 0)");

          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          this.ctx.fill();

          // Draw rays
          this.ctx.strokeStyle = "rgba(255, 255, 190, 0.7)";
          p.rays.forEach((ray) => {
            ray.angle += 0.002;
            const x1 = p.x + Math.cos(ray.angle) * p.radius;
            const y1 = p.y + Math.sin(ray.angle) * p.radius;
            const x2 = p.x + Math.cos(ray.angle) * (p.radius + ray.length);
            const y2 = p.y + Math.sin(ray.angle) * (p.radius + ray.length);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.lineWidth = ray.width;
            this.ctx.stroke();
          });
        } else {
          // Draw moon glow
          const gradient = this.ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            p.radius * 2
          );
          gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

          this.ctx.fillStyle = gradient;
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
          this.ctx.fill();

          // Draw moon
          const moonX = p.x - p.radius * 0.2;
          const moonR = p.radius;

          // Outer white moon
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, moonR, 0, Math.PI * 2);
          this.ctx.fill();

          // Shadow to create crescent
          this.ctx.fillStyle = "rgba(25, 42, 86, 0.95)";
          this.ctx.beginPath();
          this.ctx.arc(moonX, p.y, moonR * 0.9, 0, Math.PI * 2);
          this.ctx.fill();
        }

        // Transition opacity
        if (p.opacity < p.targetOpacity && !p.removing) {
          p.opacity += 0.01;
        } else if (p.removing) {
          p.opacity -= 0.01;
          if (p.opacity <= 0) {
            p.remove = true;
          }
        }
      } else if (p.type === "star") {
        // Draw stars
        if (!p.isDay) {
          // Calculate twinkle effect
          const twinkle = Math.sin(
            Date.now() * p.twinkleSpeed + p.twinklePhase
          );
          const starOpacity = p.opacity * (0.5 + 0.5 * twinkle);

          this.ctx.fillStyle = "rgba(255, 255, 255, " + starOpacity + ")";
          this.ctx.beginPath();
          this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          this.ctx.fill();

          // Transition opacity
          if (p.opacity < p.targetOpacity && !p.removing) {
            p.opacity += 0.01;
          } else if (p.removing) {
            p.opacity -= 0.01;
            if (p.opacity <= 0) {
              p.remove = true;
            }
          }
        }
      }
    });
  }

  drawClouds() {
    this.particles.forEach((cloud) => {
      if (cloud.type !== "cloud") return;

      // Determine cloud color based on whether it's a dark cloud
      let cloudColor = cloud.isDark
        ? `rgba(60, 60, 80, ${cloud.opacity})`
        : `rgba(255, 255, 255, ${cloud.opacity})`;

      this.ctx.fillStyle = cloudColor;

      // Draw cloud shape using multiple circles for fluffy effect
      this.ctx.beginPath();
      this.ctx.arc(cloud.x, cloud.y, cloud.height / 2, 0, Math.PI * 2);
      this.ctx.arc(
        cloud.x + cloud.width * 0.3,
        cloud.y - cloud.height * 0.2,
        cloud.height * 0.6,
        0,
        Math.PI * 2
      );
      this.ctx.arc(
        cloud.x + cloud.width * 0.6,
        cloud.y,
        cloud.height / 2,
        0,
        Math.PI * 2
      );
      this.ctx.fill();

      // Move cloud
      cloud.x += cloud.speed;
      if (cloud.x > this.width + cloud.width) {
        cloud.x = -cloud.width;
      }

      // Transition opacity
      if (cloud.opacity < cloud.targetOpacity && !cloud.removing) {
        cloud.opacity += 0.005;
      } else if (cloud.removing) {
        cloud.opacity -= 0.005;
        if (cloud.opacity <= 0) {
          cloud.remove = true;
        }
      }
    });
  }

  drawMist() {
    this.particles.forEach((particle) => {
      if (particle.type !== "mist") return;

      const gradient = this.ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Move mist
      particle.x += particle.speed;
      if (particle.x > this.width + particle.radius) {
        particle.x = -particle.radius;
      }

      // Transition opacity
      if (particle.opacity < particle.targetOpacity && !particle.removing) {
        particle.opacity += 0.005;
      } else if (particle.removing) {
        particle.opacity -= 0.005;
        if (particle.opacity <= 0) {
          particle.remove = true;
        }
      }
    });
  }

  updateGradient() {
    // Transition between gradients
    if (this.backgroundGradient && this.backgroundGradientTarget) {
      const transitionSpeed = 0.01;
      let needsUpdate = false;

      // Update 'from' color
      ["r", "g", "b"].forEach((channel) => {
        if (
          Math.abs(
            this.backgroundGradient.from[channel] -
              this.backgroundGradientTarget.from[channel]
          ) > 0.5
        ) {
          this.backgroundGradient.from[channel] +=
            (this.backgroundGradientTarget.from[channel] -
              this.backgroundGradient.from[channel]) *
            transitionSpeed;
          needsUpdate = true;
        } else {
          this.backgroundGradient.from[channel] =
            this.backgroundGradientTarget.from[channel];
        }
      });

      // Update 'to' color
      ["r", "g", "b"].forEach((channel) => {
        if (
          Math.abs(
            this.backgroundGradient.to[channel] -
              this.backgroundGradientTarget.to[channel]
          ) > 0.5
        ) {
          this.backgroundGradient.to[channel] +=
            (this.backgroundGradientTarget.to[channel] -
              this.backgroundGradient.to[channel]) *
            transitionSpeed;
          needsUpdate = true;
        } else {
          this.backgroundGradient.to[channel] =
            this.backgroundGradientTarget.to[channel];
        }
      });

      if (needsUpdate) {
        const fromRGB = `rgb(${Math.round(
          this.backgroundGradient.from.r
        )}, ${Math.round(this.backgroundGradient.from.g)}, ${Math.round(
          this.backgroundGradient.from.b
        )})`;
        const toRGB = `rgb(${Math.round(
          this.backgroundGradient.to.r
        )}, ${Math.round(this.backgroundGradient.to.g)}, ${Math.round(
          this.backgroundGradient.to.b
        )})`;

        document.body.style.background = `linear-gradient(135deg, ${fromRGB}, ${toRGB})`;
      }
    }
  }

  draw() {
    // Update background gradient
    this.updateGradient();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Draw weather effects based on type
    this.drawSunOrMoon(); // Always draw celestial bodies first
    this.drawClouds(); // Then clouds

    // Draw weather-specific effects
    if (this.currentWeather) {
      switch (this.currentWeather.substring(0, 2)) {
        case "09":
        case "10":
          this.drawRain();
          break;
        case "13":
          this.drawSnow();
          break;
        case "11":
          this.drawThunderstorm();
          break;
        case "50":
          this.drawMist();
          break;
      }
    }

    // Clean up removed particles
    this.particles = this.particles.filter((p) => !p.remove);

    // Add new particles if there are any
    if (this.newParticles && this.newParticles.length > 0) {
      this.particles.push(...this.newParticles);
      this.newParticles = [];
    }
  }

  animate() {
    this.draw();
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
}

// Export the class
window.WeatherAnimation = WeatherAnimation;
