## Gear Attribute Sheet API

This service is built with **Google's App script**. It uses app script's Content Service feature to serve data directly from the gear sheet. 

### Endpoints
As an API, this is pretty incomplete and doesn't strictly follow REST API guidelines.

Every endpoint starts with this url
```https://script.google.com/macros/s/AKfycbwQY10fvbOH0eo3TQ6X-uYe_TfLcWanIdqMKBx7EiXz67Uiem0/exec```

To retrieve data from the different sheets, you provide the scope identifying the sheet as a parameter to the url above.

For example, to retrieve all the player talents, the url will be:
```https://script.google.com/macros/s/AKfycbwQY10fvbOH0eo3TQ6X-uYe_TfLcWanIdqMKBx7EiXz67Uiem0/exec?scope=playertalents```

The scope names are self-explanatory but for clarity:

| scope      | Description        
| ------------- |:-------------|
| ```wepaontalents```   | Weapon Talents|
| ```playertalents```     | Player Talents     |
| ```geartalents``` | Gear Talents     |
| ```gearsets``` | Gearsets     |
| ```weapons``` | Weapons and their compatible mods     |
| ```weaponmods``` | Weapon Mods     |
| ```exoticgears``` | Exotic pieces and their talents     |

### Deploying the code
The code contained in **gearsheet_service.gs** should be placed in the Gear Attribute Sheet's script editor and executed in the context of the gearsheet.
**This part of the doc needs further update**
