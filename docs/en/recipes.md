# Recipes

Recipes are ready-made automations from the catalog [ioBroker.recipes](https://github.com/ioBroker/ioBroker.recipes):
a Blockly script with placeholders for your own devices. You choose a recipe, assign your devices, and the editor
creates an ordinary Blockly script from it. The catalog only has Blockly, no free JavaScript.

## Applying a recipe

1. Add a new script and choose **Browse recipes** at the top.
2. **Choose a recipe**: the search and the tags filter the list. On the right are the description, the inputs and a
   preview of the blocks.
3. **Assign devices**: for a device input the list offers the matching devices of the installation, grouped by room.
   They are found with the type detector, as in the device lists of ioBroker. For a state input the object selection
   opens, filtered by a matching role and type.
4. **Check** shows the blocks and the JavaScript as they will be created. **Create** saves the script in the folder
   `Rezepte` and, if wanted, starts it right away.

Afterwards the script can be edited like any other. In `common.recipe` it keeps which recipe and which version it
came from, the chosen devices (only their IDs) and values, and a hash (SHA-256) of the generated JavaScript.

The screenshots are in the [German documentation](../de/recipes.md).

## Updates

If the catalog has a newer version of the recipe, the editor shows a notice with **Update** above the script. The
update creates the script again with the stored settings:

- inputs that the new version needs in addition are asked for;
- before saving, a comparison shows what changes;
- if the script was changed after it was created from the recipe (the hash no longer matches), the dialog warns that
  these changes will be lost.

**Detach** separates the script from the recipe: it stays as it is, but gets no more updates.

## Exporting a script as a recipe

The icon **Export as recipe** in the toolbar of a Blockly script lists the states of the script. For each of them you
choose whether it becomes an input. If it belongs to a detected device, the dialog suggests the device with its type;
otherwise it becomes a state input. With a title and a description in English and German and your GitHub user name,
the recipe is downloaded as a JSON file. To share it, open a pull request in the catalog as described in
[CONTRIBUTING.md](https://github.com/ioBroker/ioBroker.recipes/blob/main/CONTRIBUTING.md).

## Settings

The address of the catalog is in the settings of the instance under **Catalog of the recipes**; empty means the
official catalog. The adapter keeps the catalog in memory for an hour and stores the version it loaded last. If the
catalog cannot be reached, the editor shows that version. Recipes that need a newer version of the javascript adapter
are hidden.
