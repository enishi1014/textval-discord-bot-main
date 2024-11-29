# Node.js公式イメージをベースにする
FROM node:18-alpine

# 作業ディレクトリを作成
WORKDIR /usr/src/app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .


# 起動コマンドを指定
CMD ["npm", "start"]
