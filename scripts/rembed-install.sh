#!/bin/sh
set -e

if [ -n "$NO_COLOR" ]; then
    BOLD=""
    RESET=""
else
    BOLD="\033[1m"
    RESET="\033[0m"
fi


usage() {
    cat <<EOF
sqlite-hello-install 0.0.1-alpha.9

USAGE:
    $0 [static|loadable] [--target=target] [--prefix=path]

OPTIONS:
    --target
            Specify a different target platform to install. Available targets: linux-x86_64, macos-aarch64, macos-x86_64, windows-x86_64

    --prefix
            Specify a different directory to save the binaries. Defaults to the current working directory.
EOF
}




current_target() {
  if [ "$OS" = "Windows_NT" ]; then
    # TODO disambiguate between x86 and arm windows
    target="windows-x86_64"
    return 0
  fi
  case $(uname -sm) in
  "Darwin x86_64") target=macos-x86_64 ;;
  "Darwin arm64") target=macos-aarch64 ;;
  "Linux x86_64") target=linux-x86_64 ;;
  *) target=$(uname -sm);;
  esac
}



process_arguments() {
  while [[ $# -gt 0 ]]; do
      case "$1" in
          --help)
              usage
              exit 0
              ;;
          --target=*)
              target="\${1#*=}"
              ;;
          --prefix=*)
              prefix="\${1#*=}"
              ;;
          static|loadable)
              type="$1"
              ;;
          *)
              echo "Unrecognized option: $1"
              usage
              exit 1
              ;;
      esac
      shift
  done
  if [ -z "$type" ]; then
    type=loadable
  fi
  if [ "$type" != "static" ] && [ "$type" != "loadable" ]; then
      echo "Invalid type '$type'. It must be either 'static' or 'loadable'."
      usage
      exit 1
  fi
  if [ -z "$prefix" ]; then
    prefix="$PWD"
  fi
  if [ -z "$target" ]; then
    current_target
  fi
}




main() {
    local type=""
    local target=""
    local prefix=""
    local url=""
    local checksum=""

    process_arguments "$@"

    echo "${BOLD}Type${RESET}: $type"
    echo "${BOLD}Target${RESET}: $target"
    echo "${BOLD}Prefix${RESET}: $prefix"

    case "$target-$type" in
    "windows-x86_64-loadable")
      url="https://github.com/asg017/sqlite-rembed/releases/download/v0.0.1-alpha.9/sqlite-rembed-0.0.1-alpha.9-loadable-windows-x86_64.tar.gz"
      checksum="6515de30625af5956a3d36b69c3919f6254b7fca8f7db7234bd0ba9168f59f02"
      ;;
    "linux-x86_64-loadable")
      url="https://github.com/asg017/sqlite-rembed/releases/download/v0.0.1-alpha.9/sqlite-rembed-0.0.1-alpha.9-loadable-linux-x86_64.tar.gz"
      checksum="5967bec7da5265b7bdfb658dc40245783a992125ff601807e69129309e41543e"
      ;;
    "macos-x86_64-loadable")
      url="https://github.com/asg017/sqlite-rembed/releases/download/v0.0.1-alpha.9/sqlite-rembed-0.0.1-alpha.9-loadable-macos-x86_64.tar.gz"
      checksum="7d32649a010f92ab970915f4d93c1e239c66646e110ebfb7b4cf2a8edce01d73"
      ;;
    "macos-aarch64-loadable")
      url="https://github.com/asg017/sqlite-rembed/releases/download/v0.0.1-alpha.9/sqlite-rembed-0.0.1-alpha.9-loadable-macos-aarch64.tar.gz"
      checksum="b3e4b8c92e31bd45b7362a7c417f95183bc7afb97f936407bae646f3c550a554"
      ;;
    *)
      echo "Unsupported platform $target" 1>&2
      exit 1
      ;;
    esac

    extension="\${url##*.}"

    if [ "$extension" = "zip" ]; then
      tmpfile="$prefix/tmp.zip"
    else
      tmpfile="$prefix/tmp.tar.gz"
    fi

    curl --fail --location --progress-bar --output "$tmpfile" "$url"

    if ! echo "$checksum $tmpfile" | sha256sum --check --status; then
      echo "Checksum fail!"  1>&2
      rm $tmpfile
      exit 1
    fi

    if [ "$extension" = "zip" ]; then
      unzip "$tmpfile" -d $prefix
      rm $tmpfile
    else
      tar -xzf "$tmpfile" -C $prefix
      rm $tmpfile
    fi

    echo "✅ $target $type binaries installed at $prefix."
}



main "$@"
