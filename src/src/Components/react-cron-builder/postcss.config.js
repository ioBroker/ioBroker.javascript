module.exports = {
    plugins: [
        require('autoprefixer')({
            browsers: ['> 5%', 'IE > 9'],
            cascade: false
        })
    ]
};
