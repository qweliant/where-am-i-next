# Where Am I Next

**Where Am I Next** is a VS Code extension that helps you identify whether you're working in a client or server component in Next.js applications.

## Features

- **Component Type Detection**: Automatically detects if your current file is a client or server component
- **Status Bar Indicator**: Shows component type (client/server) in the status bar for quick reference
- **Diagnostic Warnings**: Alerts you when using client-side features without the `"use client"` directive
- **Quick Fix**: One-click solution to add the `"use client"` directive when needed
- **Toggle Command**: Easy switching between client and server components

## How It Works

The extension analyzes your file in real-time to determine whether it's a client or server component based on:

- Presence of the `"use client"` directive
- Usage of client-side React hooks (`useState`, `useEffect`, etc.)
- Implementation of event handlers (`onClick`, `onChange`, etc.)

## Installation

1. Open VS Code
2. Go to Extensions (or press `Ctrl+Shift+X`)
3. Search for "Where Am I Next"
4. Click Install

Alternatively, you can install it directly from the marketplace:
[VS Code Marketplace: Where Am I Next](https://marketplace.visualstudio.com/items?itemName=qwelian.where-am-i-next)

## Usage

Simply open any React component file in your Next.js project. The extension will automatically:

1. Display the component type in the status bar
2. Highlight potential issues with client/server component usage
3. Offer quick fixes for common problems

### Commands

- `Where Am I Next: Toggle Component Type` - Switch between client and server component by adding/removing the `"use client"` directive

## Requirements

- VS Code version 1.98.0 or higher
- Next.js project using React components

## Extension Settings

This extension has no configurable settings at this time.

## Known Issues

Please report any issues on the [GitHub repository](https://github.com/qwelian/where-am-i-next/issues).

## Release Notes

### 0.0.1

- Initial release
- Basic detection of client and server components
- Status bar indicator
- Quick fix for adding "use client" directive

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues on the GitHub repository.

## License

This extension is licensed under the MIT License.

## Author

Created by [qwelian](mailto:dmtorcode@tutanota.com)
