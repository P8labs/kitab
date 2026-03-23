#!/usr/bin/env bash

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PACKAGE_FILE="package.json"
TAURI_CONF_FILE="src-tauri/tauri.conf.json"

usage() {
  echo -e "${RED}Usage: $0 <major|minor|patch> [--no-commit]${NC}"
  echo -e "Example: $0 patch"
  exit 1
}

get_version() {
  if [[ ! -f "$PACKAGE_FILE" ]]; then
    echo -e "${RED}Missing $PACKAGE_FILE${NC}"
    exit 1
  fi

  local v
  v=$(jq -r '.version' "$PACKAGE_FILE" | tr -d '[:space:]')

  if [[ ! "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}package.json version is not valid semver (x.y.z): $v${NC}"
    exit 1
  fi

  echo "$v"
}

parse_version() {
  local version=$1
  MAJOR=$(echo "$version" | cut -d. -f1)
  MINOR=$(echo "$version" | cut -d. -f2)
  PATCH=$(echo "$version" | cut -d. -f3)
}

bump_version() {
  local bump_type=$1
  parse_version "$CURRENT_VERSION"

  case $bump_type in
    major)
      MAJOR=$((MAJOR + 1))
      MINOR=0
      PATCH=0
      ;;
    minor)
      MINOR=$((MINOR + 1))
      PATCH=0
      ;;
    patch)
      PATCH=$((PATCH + 1))
      ;;
    *)
      echo -e "${RED}Invalid bump type. Use: major, minor, or patch${NC}"
      exit 1
      ;;
  esac

  echo "$MAJOR.$MINOR.$PATCH"
}

update_package_json() {
  local new_version=$1

  if [[ ! -f "$PACKAGE_FILE" ]]; then
    echo -e "${RED}Missing $PACKAGE_FILE${NC}"
    exit 1
  fi

  if command -v jq &> /dev/null; then
    jq ".version = \"$new_version\"" "$PACKAGE_FILE" > temp.json && mv temp.json "$PACKAGE_FILE"
  else
    sed -i "s/\"version\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"version\": \"$new_version\"/" "$PACKAGE_FILE"
  fi

  echo -e "${GREEN}Updated $PACKAGE_FILE version to $new_version${NC}"
}

update_tauri_conf() {
  local new_version=$1

  if [[ ! -f "$TAURI_CONF_FILE" ]]; then
    echo -e "${RED}Missing $TAURI_CONF_FILE${NC}"
    exit 1
  fi

  if command -v jq &> /dev/null; then
    jq ".version = \"$new_version\"" "$TAURI_CONF_FILE" > temp.json && mv temp.json "$TAURI_CONF_FILE"
  else
    sed -i "s/\"version\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"version\": \"$new_version\"/" "$TAURI_CONF_FILE"
  fi

  echo -e "${GREEN}Updated $TAURI_CONF_FILE version to $new_version${NC}"
}

create_tag() {
  local version=$1
  local tag="v$version"

  echo -e "${YELLOW}Creating commit and git tag: $tag${NC}"

  git add .
  git commit -m "chore: bump version to $version"
  git tag -a "$tag" -m "Release $version"

  echo -e "${GREEN}Tag created: $tag${NC}\n"
  echo -e "${BLUE}To push and trigger release workflow:${NC}"
  echo -e "${YELLOW}  git push origin main && git push origin $tag${NC}\n"
}

show_info() {
  local version=$1

  echo -e "\n${BLUE}==============================================${NC}"
  echo -e "${GREEN}Kitab Release Info${NC}"
  echo -e "${BLUE}==============================================${NC}"
  echo -e "${YELLOW}Version:${NC}   $version"
  echo -e "${YELLOW}Binary:${NC}    kitab"
  echo -e "${YELLOW}Tag:${NC}       v$version"
  echo -e "${BLUE}==============================================${NC}\n"
}

main() {
  if [[ $# -lt 1 ]]; then
    usage
  fi

  local bump_type=$1
  local no_commit=false

  if [[ $# -eq 2 ]]; then
    case "$2" in
      --no-commit)
        no_commit=true
        ;;
      *)
        usage
        ;;
    esac
  fi

  CURRENT_VERSION=$(get_version)

  echo -e "${BLUE}Current version:${NC} $CURRENT_VERSION"

  NEW_VERSION=$(bump_version "$bump_type")
  echo -e "${GREEN}New version:${NC}     $NEW_VERSION"

  read -r -p "Continue with version bump? (y/N) " REPLY
  if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo -e "${RED}Aborted.${NC}"
    exit 1
  fi

  update_package_json "$NEW_VERSION"
  update_tauri_conf "$NEW_VERSION"

  show_info "$NEW_VERSION"

  if [[ "$no_commit" == true ]]; then
    echo -e "${YELLOW}Version bumped without commit/tag.${NC}"
    echo -e "${BLUE}Run when ready:${NC}"
    echo -e "${YELLOW}  git add .${NC}"
    echo -e "${YELLOW}  git commit -m 'chore: bump version to $NEW_VERSION'${NC}"
    echo -e "${YELLOW}  git tag -a v$NEW_VERSION -m 'Release $NEW_VERSION'${NC}"
    echo -e "${YELLOW}  git push origin main && git push origin v$NEW_VERSION${NC}"
    exit 0
  fi

  read -r -p "Create git commit and tag now? (y/N) " REPLY
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    create_tag "$NEW_VERSION"
  else
    echo -e "${YELLOW}Version bumped without commit/tag.${NC}"
    echo -e "${BLUE}Run when ready:${NC}"
    echo -e "${YELLOW}  git add .${NC}"
    echo -e "${YELLOW}  git commit -m 'chore: bump version to $NEW_VERSION'${NC}"
    echo -e "${YELLOW}  git tag -a v$NEW_VERSION -m 'Release $NEW_VERSION'${NC}"
    echo -e "${YELLOW}  git push origin main && git push origin v$NEW_VERSION${NC}"
  fi
}

main "$@"
