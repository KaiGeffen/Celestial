import platform
import os
import sys
# Resources shared by both the Network and Server files

BUFSIZE = 4096 * 2
PORT = 5555
INTERNAL_PORT = 4321
# The ipv4 address of the host machine. Run ipconfig from cmd to get this
HOST = "127.0.0.1"
if platform.system() == 'Darwin':
    LOCAL = "127.0.0.1" #"192.168.1.154"
else:
    # This allows you to try out different ports when running through DO cli
    if len(sys.argv) >= 2:
        LOCAL = os.getenv('HOSTNAME')
        PORT = sys.argv[1]
    else:
        LOCAL = os.getenv('HOSTNAME')

SINGLE_PLAYER = True

# Time client waits between sending requests for changed state
CLIENT_WAIT = 0.1

# Messages
GET_STATE = 'Get'
DO_ACTION = 'Do'
INIT_MSG = 'Init'
MULLIGAN_MSG = 'Mull'

# Responses
NO_UPDATE = 'No update'
UPDATE = 'Update'
VALID_CHOICE = 'Valid choice'
INVALID_CHOICE = 'Invalid choice'


# Log into router, port forwarding, port 5555 to my local machine
# Tell my router goes to the ip I had been using