os:
  - linux
  - osx
language: node_js
node_js:
  - '4'
  - '6'
  - '8'
  - '10'
before_script:
  - export NPMVERSION=$(echo "$($(which npm) -v)"|cut -c1)
  - 'if [[ $NPMVERSION == 5 ]]; then npm install -g npm@5; fi'
  - npm -v
  - npm install winston@2.3.1
  - 'npm install https://github.com/ioBroker/ioBroker.js-controller/tarball/master --production'
env:
  - CXX=g++-4.8
addons:
  apt:
    sources:
      - ubuntu-toolchain-r-test
    packages:
      - g++-4.8
