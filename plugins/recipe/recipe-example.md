---
title: "Simple Pancakes - Example Recipe"
author: "The Plugin Chef"
date: "{{ .CurrentDateISO }}"
tags: ["breakfast", "easy", "example"]
md_to_pdf_plugin: "./recipe.config.yaml"

# Other potential recipe-specific front matter fields:
# prep_time: "10 minutes"
# cook_time: "15 minutes"
# servings: "4"
# category: "Breakfast"
---

{{% recipe %}}

This is an example recipe to demonstrate the **`recipe`** plugin. It uses the `md_to_pdf_plugin: "./recipe.config.yaml"` key in its front matter. This means it will automatically use the `recipe` plugin's specific configuration when you run `md-to-pdf recipe-example.md` from within the `plugins/recipe/` directory.

The `recipe` plugin is designed for clear and readable recipe formatting.

### Ingredients

* 1 cup All-Purpose Flour
* 2 tbsp Granulated Sugar
* 2 tsp Baking Powder
* 1/2 tsp Salt
* 1 large Egg
* 1 cup Milk
* 2 tbsp Unsalted Butter, melted
* (Optional) 1 tsp Vanilla Extract

### Directions

1.  **Prepare Dry Ingredients:** In a large bowl, whisk together the flour, sugar, baking powder, and salt.
2.  **Prepare Wet Ingredients:** In a separate medium bowl, whisk together the egg, milk, melted butter, and vanilla extract (if using).
3.  **Combine:** Pour the wet ingredients into the dry ingredients. Whisk gently until just combined. Do not overmix; a few lumps are okay. Let the batter rest for 5 minutes.
4.  **Cook:** Heat a lightly oiled griddle or non-stick frying pan over medium heat. For each pancake, pour or scoop about 1/4 cup of batter onto the hot griddle.
5.  Cook for 2-3 minutes per side, or until golden brown and bubbles appear on the surface. Flip and cook the other side until golden.
6.  **Serve:** Serve immediately with your favorite toppings like maple syrup, fresh fruit, or whipped cream.

### Notes

* For fluffier pancakes, ensure your baking powder is fresh.
* Don't press down on the pancakes while cooking, as this can make them dense.

{{% /recipe %}}

---

For using the `recipe` plugin with *your actual* recipe Markdown files from any directory (e.g., `md-to-pdf convert my_favorite_pancakes.md --plugin recipe`), ensure it's registered in a main `md-to-pdf` configuration file. (It usually is by default in `config.example.yaml`).
