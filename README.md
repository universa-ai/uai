# uai

## Overview

uai is a powerful tool designed to facilitate seamless communication with the OpenAI API using JSX files. Built on the Bun runtime, uai is optimized for speed and efficiency, making it an ideal choice for developers looking to integrate AI capabilities into their projects. The program is designed to handle multiple tasks concurrently while ensuring stability and security.

## Design Goals

1. **Speed**: Leveraging Bun's fast runtime, uai ensures quick execution of tasks, reducing latency in API interactions.
2. **Stability**: With robust error handling and file locking mechanisms, uai maintains stability even under heavy workloads.
3. **Flexibility**: uai supports processing multiple input files simultaneously, allowing for versatile use cases.
4. **Security**: The program requires API keys to be set, ensuring secure communication with the OpenAI API.

## Features

- **JSX File Parsing**: uai reads and processes JSX files to extract necessary information for API requests.
- **OpenAI API Integration**: Sends requests to the OpenAI API and retrieves responses, facilitating AI-driven functionalities.
- **File Management**: Automatically creates and manages directories and files for storing prompts and responses.
- **Git Integration**: Assists with git operations such as branch creation and committing changes, streamlining version control.
- **Error Handling**: Logs errors and provides mechanisms to address them, ensuring smooth operation.
- **Environment Setup**: Requires environment variables, particularly API keys, to be configured for secure operation.

## Installation

To install the necessary dependencies, run:
