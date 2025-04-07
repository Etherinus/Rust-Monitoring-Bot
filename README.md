# 📊 Rust Monitoring Bot

[![Author](https://img.shields.io/badge/Author-Etherinus-blue.svg)](https://github.com/Etherinus) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) 

Hello! This is `rust-monitoring-bot`. This Discord bot helps Rust server administrators easily display information about their servers and monitor their online status using BattleMetrics, employing a more modern and maintainable code approach.

## ✨ Features

*   **Informational Embeds:** Create and manage beautiful embeds with server information (IP, wipe schedule, restarts, mode, map, etc.).
*   **BattleMetrics Monitoring:** Automatically track the online/offline status and player count of Rust servers via the BattleMetrics API.
*   **Unified Monitoring Message:** Display the status of all monitored servers in a single, automatically updated Discord message.
*   **Flexible Customization:** Set custom colors for each monitoring embed. Configure the update interval and other parameters via `.env`.
*   **Automatic Updates:** Server statuses update at a configurable interval (default is 15 minutes).
*   **Easy Management:** All commands accessible via Discord slash commands (`/`).
*   **Data Persistence:** Embed configurations and monitoring server lists are saved in JSON files within the `data/` folder (filenames are configurable).
*   **Improved Structure:** Modular code separated into services, commands, events, and utilities for better readability and maintainability.
*   **Configuration via `.env`:** Centralized and secure management of all keys and parameters.
*   **Logging:** Uses `winston` for more informative logging of events and errors.

## ⚙️ Prerequisites

Before you start, ensure you have installed:

*   [Node.js](https://nodejs.org/) (version 18.x or higher recommended)
*   [npm](https://www.npmjs.com/) (usually installed with Node.js) or [yarn](https://yarnpkg.com/)
*   **Discord Bot Account:** Create an application and bot on the [Discord Developer Portal](https://discord.com/developers/applications). You will need:
    *   Bot `TOKEN`
    *   Application `CLIENT_ID`
*   **Your Discord Server (Guild) ID:** [How to find your ID](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID-)
*   **(Optional, for monitoring) BattleMetrics API Token:** Obtain a token from [BattleMetrics Developers](https://www.battlemetrics.com/developers).

## 🚀 Installation and Launch

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/etherinus/rust-monitoring-bot
    cd rust-monitoring-bot
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or if using yarn:
    # yarn install
    ```

3.  **Create the `.env` configuration file:**
    *   In the **project's root directory** (at the same level as the `src` folder), create a file named `.env`.
    *   Copy the content below and fill in **your** values.

    ```dotenv
    # === Required Variables ===

    # Your Discord Bot Token
    TOKEN=YOUR_DISCORD_BOT_TOKEN

    # Your Discord Application Client ID (Application ID)
    CLIENT_ID=YOUR_APPLICATION_CLIENT_ID

    # Discord Server (Guild) ID where commands will be registered
    GUILD_ID=YOUR_DISCORD_SERVER_ID

    # === Variables for Monitoring (Required if using monitoring) ===

    # BattleMetrics API Token
    BATTLEMETRICS_TOKEN=YOUR_BATTLEMETRICS_API_TOKEN

    # === Optional Variables (Have default values in config/index.js) ===

    # Monitoring update interval in minutes (default: 15)
    MONITOR_INTERVAL_MINUTES=15

    # Logging level (error, warn, info, debug) (default: info)
    LOG_LEVEL=debug

    # Delay between requests to different BM servers in ms (default: 600)
    BM_REQUEST_DELAY_MS=1000

    # Delay before the first monitoring cycle starts in ms (default: 10000)
    MONITOR_INITIAL_DELAY_MS=5000

    # Default icon URL for server info embeds (default: Flaticon icon URL)
    DEFAULT_EMBED_ICON=https://example.com/icon.png

    # Path to the directory for storing data files (default: ./data)
    DATA_PATH=/app/data

    # Filename for embed data (within DATA_PATH) (default: embedsData.json)
    EMBEDS_DATA_FILE=server_info.json

    # Filename for monitoring data (within DATA_PATH) (default: monitors_combined_v3.json)
    MONITOR_DATA_FILE=monitors.json
    ```
    ⚠️ **Important:** Do not add the `.env` file to version control (Git). Ensure it is listed in your `.gitignore` file.

4.  **Create the data directory:**
    *   In the **project's root directory**, manually create a folder named `data`. The bot will automatically create JSON files inside it.

5.  **Invite the bot to your server:**
    *   Generate a bot invite link from the Discord Developer Portal (`OAuth2` -> `URL Generator`). Select the `bot` and `application.commands` scopes.
    *   Ensure the bot has the necessary permissions in Discord: `View Channels`, `Send Messages`, `Embed Links`, `Manage Messages` (for deleting old messages).
    *   Follow the link to add the bot to your server (the one whose ID is specified in `.env`).

6.  **Run the bot:**
    ```bash
    node src/index.js
    ```
    *Or, if you have configured a `start` script in `package.json`:*
    ```bash
    npm start
    # or
    # yarn start
    ```

7.  **(Optional, on first run or after changing commands) Register commands:**
    *   If commands don't appear in Discord, open `src/index.js`, find and **uncomment** the line `// await registerCommands(client);`.
    *   **Restart the bot once**. Wait for the log `[API] ✅ Successfully registered application commands.`.
    *   **Comment the line back out** and save the file.

After launching, the bot will load the configuration, initialize services, and be ready for use.

## 🛠️ Commands

All commands are accessible via `/` and require **Administrator** permissions on the Discord server.

---

### ℹ️ Informational Embed Management

These commands manage static informational embeds about the server(s). All embeds appear in a single message that the bot updates whenever changes are made.

* `/setserverinfo`
  * **Description:** Creates or completely overwrites the *main* (first) embed with server information. Existing embeds, if any, will be removed.
  * **Parameters:**
    * `servername` (Required): Name of the server.
    * `color` (Required): Embed color in HEX format (e.g., `FAA61A`).
    * `ipaddress` (Required): IP address and port of the server (`IP:PORT`).
    * `wipe_day` (Required): Wipe day of the week (selection from list).
    * `wipe_time` (Required): Wipe time in `HH:MM` format (e.g., `16:00`).
    * `restart_time` (Required): Daily restart time in `HH:MM` format (e.g., `05:00`).
    * `mode` (Required): Server mode (Vanilla, Modded, etc., selection from list).
    * `teamlimit` (Required): Team limit (Solo, Duo, etc., selection from list).
    * `map` (Required): Server map (Procedural, Custom, etc., selection from list).
    * `iconurl` (Optional): Server icon URL (default Discord icon used if not specified).

* `/addembed`
  * **Description:** Adds a *new* embed with server information to existing ones.
  * **Parameters:** Same as `/setserverinfo`.

* `/removeembed`
  * **Description:** Removes an embed based on its sequential number (starting from 1).
  * **Parameters:**
    * `index` (Required): Embed number to remove (integer >= 1).

---

### 📈 BattleMetrics Monitoring Management

These commands manage the list of Rust servers monitored through BattleMetrics. The status of all servers appears in one message and automatically updates every 15 minutes.

* `/setrustmonitor`
  * **Description:** Adds a new server to monitoring or updates settings for an existing one (e.g., color).
  * **Parameters:**
    * `bmid` (Required): Server ID on BattleMetrics.
    * `color` (Optional): Embed color for this server in HEX format (6 characters, e.g., `FF0000`). Default color (gray) is used if not specified.

* `/stoprustmonitor`
  * **Description:** Removes a server from monitoring by its BattleMetrics ID.
  * **Parameters:**
    * `bmid` (Required): Server ID on BattleMetrics to remove from monitoring.

---

## 🚀 Required Emojis Setup

Bot uses custom emojis to clearly display server statuses.  
Make sure to upload the following emojis to your bot via the [Discord Developer Portal](https://discord.com/developers):

| Name (exact)         | Used for                          |
|----------------------|-----------------------------------|
| `server`             | General server info               |
| `serveronline`       | Server online status              |
| `servererror`        | Server offline or error status    |
| `connect`            | Server connection info            |

**Important:** Emoji names must exactly match the names shown above to function correctly with the bot's embed messages.

**How to upload emojis:**  
- Go to your bot’s app in the [Discord Developer Portal](https://discord.com/developers).
- Navigate to the **Emoji** tab.
- Upload each emoji, assigning exactly the provided names.

**Emoji file requirements:**  
- Format: PNG, JPEG, GIF  
- Maximum size: 256 KB  
- Recommended dimensions: 128×128 px

⚡ **Why is this specific emoji naming important?**  
Because the code contains constructs such as:

```javascript
name: '<:server:1354278159423504559> **Server:**'
```

where:

- `server` — the emoji's name.
- `1354278159423504559` — the emoji's ID (automatically assigned by Discord upon upload).

If the emoji's name on Discord doesn't match the name specified in your code, the emoji simply won't display correctly in embed messages.

🔹 **Important code update:**

Make sure to replace `<:serveronline:1354278141333471302>` and other emoji placeholders in your `battlemetricsUtils.js` file with your actual emoji IDs. Ensure your emojis have been correctly uploaded to Discord, and their IDs match those defined in your JavaScript code.

Example:

```javascript
embed.addFields(
    {
        name: '<:serveronline:YOUR_REAL_EMOJI_ID> **Status:**',
        value: `Online - ${status.currentPlayers}/${status.maxPlayers}`,
        inline: false
    }
);
```

Replace `YOUR_REAL_EMOJI_ID` with the actual ID from your Discord emojis.

---

## 📁 Project Structure

```bash
rust-monitoring-bot/
│
├── src/                            # Main source code directory
│   ├── index.js                    # Application entry point: Initializes client, services, loads commands & events
│   ├── commands/                   # Contains all slash command definitions
│   │   ├── index.js                # Loads all command files and handles command registration
│   │   └── admin/                  # Subdirectory for commands requiring administrator permissions
│   ├── config/                     # Handles configuration loading
│   │   └── index.js                # Loads environment variables from .env and provides the config object
│   ├── errors/                     # Custom error classes for specific error handling
│   │   └── AppError.js             # Base custom error class
│   ├── events/                     # Discord.js event handlers
│   │   ├── index.js                # Loads all event handler files
│   │   ├── interactionCreate.js    # Handles incoming interactions (slash commands, buttons, etc.)
│   │   └── ready.js                # Executes code when the bot successfully connects to Discord
│   ├── services/                   # Core business logic, data management, and external API interactions
│   │   ├── BattleMetricsService.js # Handles all communication with the BattleMetrics API
│   │   ├── EmbedDataService.js     # Manages the creation, storage, and updating of informational embeds
│   │   ├── MonitorDataService.js   # Manages the list and state of monitored servers
│   │   └── MonitoringService.js    # Orchestrates the periodic fetching and updating of server statuses
│   └── utils/                      # Utility functions, constants, and shared helpers
│       ├── constants.js            # Defines shared constants like command names, options, default values
│       ├── discordUtils.js         # Helper functions specific to Discord.js (e.g., building embeds, safe replies)
│       ├── logger.js               # Configures the Winston logger for application-wide logging
│       ├── textUtils.js            # Utility functions for string manipulation and formatting
│       └── timeUtils.js            # Utility functions for time/date calculations (e.g., next wipe/restart)
│
├── data/                           # Directory storing persistent data (Must be created manually first)
│   ├── embedsData.json             # Stores data for informational embeds (Auto-generated on first save)
│   └── monitors_combined_v1.json   # Stores data for monitored servers (Auto-generated on first save)
│
├── logs/                           # Directory for log files (May be created by Winston if file transport is enabled)
├── node_modules/                   # Stores project dependencies (Managed by npm/yarn)
├── .env                            # Environment variables (BOT TOKEN, API keys, etc.)
├── .gitignore                      # Specifies intentionally untracked files that Git should ignore
├── package.json                    # Lists project dependencies and defines npm scripts
├── package-lock.json               # Records exact versions of dependencies (Generated by npm)
└── README.md                       # This file: Project description, setup, and usage guide
```

---

## 🔧 How It Works

* **Informational Embeds:** Commands `/setserverinfo`, `/addembed`, `/removeembed` update the embed array stored in `embedsData.json`. After each update, the bot attempts to delete the old embed message (if it exists) and sends a new message with the updated set of embeds. Channel and message IDs are saved for future updates.
* **BattleMetrics Monitoring:** Commands `/setrustmonitor` and `/stoprustmonitor` manage the list of servers (`monitoredServers`) in `monitors_combined_v1.json`. The bot periodically (every 15 minutes, configurable in `monitorData.js`) fetches each server's status via the BattleMetrics API. It then creates or updates a single Discord message containing individual status embeds for each monitored server. Channel and monitoring message IDs are also stored in `monitors_combined_v1.json`.

---

## 🖼️ Screenshots

1. Informational Embeds  
![Informational Embeds](https://i.imgur.com/oIQrhRU.png)

2. Single Server Monitoring  
![Single Server Monitoring](https://i.imgur.com/9C4B9My.png)

3. Multiple Servers Monitoring  
![Multiple Servers Monitoring](https://i.imgur.com/nZiIsSB.png)

## 🤝 Contribution

If you find a bug or have suggestions for improvements, please create an Issue or Pull Request in this repository.

## 👤 Author

* **Thomas Rendes (Etherinus)**
* GitHub: [Etherinus](https://github.com/Etherinus)

## 📄 License

Distributed under MIT License. See `LICENSE` for additional information.
