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
      const driverObj = driver({
        showProgress: true,
        allowClose: false,
        animate: true,
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
