import os
import argparse

from twisted.internet import reactor
from wslink import register, server
from wslink.websocket import ServerProtocol

from app import AppProtocol

class Server(ServerProtocol):
    def initialize(self):
        self.registerLinkProtocol(AppProtocol())
        self.updateSecret('wslink-secret')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Server')
    server.add_arguments(parser)

    args = parser.parse_args()

    server.start_webserver(options=args, protocol=Server)
