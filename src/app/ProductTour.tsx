import React, { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function ProductTour() {
  useEffect(() => {
    // Only run this once
    const isCompleted = localStorage.getItem("forge_tour_completed");
    if (isCompleted) {
      return;
    }

    // A small delay to ensure the DOM is fully painted (panels are rendered)
    const timeout = setTimeout(() => {
      let timer: number;
      let startTime: number;
      let bar: HTMLDivElement | null = null;

      const driverObj = driver({
        showProgress: true,
        allowClose: false,
        animate: true,
        showButtons: ['next', 'previous'],
        onPopoverRender: (popover) => {
          cancelAnimationFrame(timer);

          // Inject Skip Button
          let skipBtn = popover.wrapper.querySelector('.custom-skip-btn') as HTMLButtonElement | null;
          if (!skipBtn) {
            skipBtn = document.createElement('button');
            skipBtn.className = "custom-skip-btn";
            skipBtn.innerText = "Skip Tour";
            skipBtn.style.cssText = "position: absolute; top: 12px; right: 12px; font-size: 12px; color: #888; background: transparent; border: none; cursor: pointer; transition: color 0.2s;";
            skipBtn.onmouseover = () => skipBtn!.style.color = "#fff";
            skipBtn.onmouseleave = () => skipBtn!.style.color = "#888";
            skipBtn.onclick = () => {
              localStorage.setItem("forge_tour_completed", "true");
              driverObj.destroy();
            };
            popover.wrapper.appendChild(skipBtn);
          }

          // Inject Progress Bar
          let progressContainer = popover.wrapper.querySelector('.custom-progress-bar-container') as HTMLDivElement | null;
          if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.className = "custom-progress-bar-container";
            progressContainer.style.cssText = "width: 100%; height: 4px; background: rgba(255,255,255,0.1); position: absolute; bottom: 0; left: 0; border-radius: 0 0 5px 5px; overflow: hidden;";
            
            bar = document.createElement('div');
            bar.style.cssText = "width: 0%; height: 100%; background: #007bff; transition: none;";
            progressContainer.appendChild(bar);
            
            popover.wrapper.appendChild(progressContainer);
          } else {
            bar = progressContainer.firstChild as HTMLDivElement;
          }

          startTime = Date.now();
          const duration = 5000;

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const percent = Math.min((elapsed / duration) * 100, 100);
            if (bar) bar.style.width = `${percent}%`;

            if (elapsed >= duration) {
              if (driverObj.hasNextStep()) {
                driverObj.moveNext();
              } else {
                localStorage.setItem("forge_tour_completed", "true");
                driverObj.destroy();
              }
            } else {
              timer = requestAnimationFrame(animate);
            }
          };
          timer = requestAnimationFrame(animate);
        },
        steps: [
          {
            popover: {
              title: "Welcome to Forge ✨",
              description: "Let's take a quick tour on how to create your first visual masterpiece. Click Next to begin!",
              align: "center"
            }
          },
          {
            element: '[data-panel-id="layers"]',
            popover: {
              title: "1. The Layer Stack",
              description: "This is where your visual layers live. Start by clicking the '+' button to add your first blank layer.",
              side: "right",
              align: "start"
            }
          },
          {
            element: '[data-panel-id="controls"]',
            popover: {
              title: "2. Layer Actions",
              description: "With a layer selected, pick an effect from the actions panel (like 'Add Shader' or 'Add Tech Overlay') to instantly transform it.",
              side: "left",
              align: "start"
            }
          },
          {
            element: '[data-panel-id="controls"]',
            popover: {
              title: "3. Fine-Tuning",
              description: "Scroll down to tweak your layer's colors, complexity, Blend Mode, and Opacity. Blend modes are the secret sauce!",
              side: "left",
              align: "center"
            }
          },
          {
            popover: {
              title: "4. The Canvas",
              description: "Watch your creation come to life here in the center in real-time. You can stack as many layers as you want and mix them together.",
              align: "center"
            }
          },
          {
            element: '[data-panel-id="controls"]',
            popover: {
              title: "5. Shuffle & Export",
              description: "Feeling lucky? Hit the Randomize button to instantly shuffle your settings. When you're happy with the result, hit Export PNG!",
              side: "left",
              align: "end"
            }
          }
        ],
        onDestroyStarted: () => {
          cancelAnimationFrame(timer);
          localStorage.setItem("forge_tour_completed", "true");
          driverObj.destroy();
        }
      });

      driverObj.drive();
    }, 1000); // Wait 1s for the UI to settle

    return () => clearTimeout(timeout);
  }, []);

  return null; // This component is logic-only, it renders no UI directly
}
