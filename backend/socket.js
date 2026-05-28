let io;

export const initSocket = (server) => {

    io = require('socket.io')(server, {
        cors: {
            origin: 'http://localhost:3000',
            credentials: true
        }
    });

    io.on('connection', socket => {

        console.log(
            '🔌',
            socket.id
        );

        socket.on(
            'join-order',
            (orderId) => {

                socket.join(
                    `order-${orderId}`
                );

            }
        );

        socket.on(
            'disconnect',
            () => {

                console.log(
                    '❌',
                    socket.id
                );

            }
        );

    });

};

export const getIO =
    () => io;