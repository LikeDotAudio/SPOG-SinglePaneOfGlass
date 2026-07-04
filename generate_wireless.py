import os
import json

base_dir = "/home/anthony/Documents/GitProjects/TwistRouting"
routes_dir = os.path.join(base_dir, "Routes")
sound_dir = os.path.join(routes_dir, "Sources", "001_Sound")
prod_dir = os.path.join(routes_dir, "Sources", "005_Prod")
people_dir = os.path.join(routes_dir, "People")

# 1. Generate a wireless microphone controller per production, per floor and for the people.

controller_template = {
    "id": "",
    "name": "WIRELESS CONTROLLER",
    "type": "wireless-controller",
    "status": "OK"
}

def create_controller(target_dir, id_prefix, name_suffix):
    if not os.path.exists(target_dir):
        return
    data = controller_template.copy()
    data["id"] = f"wl-ctrl-{id_prefix.lower()}"
    data["name"] = f"WIRELESS CONTROLLER - {name_suffix}"
    
    filepath = os.path.join(target_dir, "000_Wireless_Controller.json")
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

# Per Production
for prod in os.listdir(prod_dir):
    p = os.path.join(prod_dir, prod)
    if os.path.isdir(p):
        create_controller(p, prod, prod.split('_', 1)[-1].upper())

# Per Floor
for floor in os.listdir(sound_dir):
    p = os.path.join(sound_dir, floor)
    if os.path.isdir(p):
        create_controller(p, floor.replace(' ', '-'), floor.split('_', 1)[-1].upper())

# For the people (overall)
create_controller(people_dir, "people", "PEOPLE")

# 2. Extract people list
people_list = []
for root, dirs, files in os.walk(people_dir):
    for f in sorted(files):
        if f.endswith(".json") and f != "index.json" and f != "000_Wireless_Controller.json":
            with open(os.path.join(root, f)) as fin:
                try:
                    data = json.load(fin)
                    if "name" in data and data.get("role") != "wireless-controller":
                        people_list.append(data["name"])
                except:
                    pass

# Remove duplicates while preserving order
seen = set()
people_list = [x for x in people_list if not (x in seen or seen.add(x))]

# Pad people_list to at least 40 packs
while len(people_list) < 40:
    people_list.append(f"GUEST {len(people_list) + 1:02d}")

# 3. Generate wireless mics with sub folders
wl_base = os.path.join(sound_dir, "006_Wireless Microphones")
os.makedirs(wl_base, exist_ok=True)

for i, person in enumerate(people_list):
    pack_num = i + 1
    
    if 1 <= pack_num <= 9:
        sub_folder = "001_Packs 1-9"
    elif 10 <= pack_num <= 19:
        sub_folder = "002_Packs 10-19"
    elif 20 <= pack_num <= 29:
        sub_folder = "003_Packs 20-29"
    else:
        sub_folder = f"{str(pack_num // 10 + 1).zfill(3)}_Packs {pack_num // 10 * 10}-{(pack_num // 10 * 10) + 9}"
        
    target_dir = os.path.join(wl_base, sub_folder)
    os.makedirs(target_dir, exist_ok=True)
    
    # Generate Primary
    pri_data = {
        "id": f"wl-pack-{pack_num}-pri",
        "name": f"PACK {pack_num:02d} PRI - {person}",
        "person": person,
        "pack": pack_num,
        "type": "wireless-mic",
        "role": "primary",
        "status": "OK"
    }
    # Index in the subfolder will be based on position (e.g. 1st pack in folder gets 001, 002)
    # The pack_num inside the folder:
    if pack_num <= 9:
        idx_pri = (pack_num - 1) * 2 + 1
        idx_bak = (pack_num - 1) * 2 + 2
    else:
        rem = pack_num % 10
        idx_pri = rem * 2 + 1
        idx_bak = rem * 2 + 2

    pri_filename = f"{idx_pri:03d}_Pack {pack_num:02d} PRI - {person}.json"
    with open(os.path.join(target_dir, pri_filename), 'w') as f:
        json.dump(pri_data, f, indent=2)
        
    # Generate Backup
    bak_data = {
        "id": f"wl-pack-{pack_num}-bak",
        "name": f"PACK {pack_num:02d} BAK - {person}",
        "person": person,
        "pack": pack_num,
        "type": "wireless-mic",
        "role": "backup",
        "status": "OK"
    }
    bak_filename = f"{idx_bak:03d}_Pack {pack_num:02d} BAK - {person}.json"
    with open(os.path.join(target_dir, bak_filename), 'w') as f:
        json.dump(bak_data, f, indent=2)

print("Generated wireless controllers and microphone packs.")
