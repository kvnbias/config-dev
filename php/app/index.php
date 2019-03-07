<?php

require_once('vendor/autoload.php');

use Monolog\Logger;
use Monolog\Handler\StreamHandler;
use Monolog\Formatter\LineFormatter;

class SecureSessionHandler extends \SessionHandler
{
    protected $key;
    protected $name;
    protected $cookie;

    private $cipher = 'aes-128-gcm';

    private $tag = 16;

    private $iv = 'b/xpH/59k9bViz1i';

    public function __construct(
        string $key,
        string $name = 'EXSESSIONID',
        array $cookie = []
    ) {
        $this->key    = $key;
        $this->name   = $name;
        $this->cookie = $cookie;

        // The path of the domain for which the cookie is valid.
        $cookiePath = ini_get('session.cookie_path');

        /**
         * The domain for which the cookie is valid. Default is none at all
         * meaning the host name of the server which generated the cookie
         * according to cookies specification.
         */
        $cookieDomain = ini_get('session.cookie_domain');

        $this->cookie += [
            'lifetime' => 0,
            'path'     => $cookiePath,
            'domain'   => $cookieDomain,
            'secure'   => isset($_SERVER['HTTPS']),
            'httponly' => true
        ];

        $this->setup();
    }

    protected function setup()
    {
        // Whether to use cookies.
        ini_set('session.use_cookies', 1);

        /**
         * This option forces PHP to fetch and use a cookie for storing and
         * maintaining the session id. We encourage this operation as it's
         * very helpful in combating session hijacking when not specifying
         * and managing your own session id. It is not the be-all and end-all
         * of session hijacking defense, but it's a good start.
         */
        ini_set('session.use_only_cookies', 1);

        session_name($this->name);

        session_set_cookie_params(
            $this->cookie['lifetime'],
            $this->cookie['path'],
            $this->cookie['domain'],
            $this->cookie['secure'],
            $this->cookie['httponly']
        );
    }

    /**
     * In-principle wraps the ‘session_start’ function, however, as
     * a precaution there is a one-in-five chance that the session
     * identifier is regenerated (to address session fixation/hijacking).
     */
     public function start()
    {
        if (session_id() === '') {
            if (session_start()) {
                return (mt_rand(0, 4) === 0) ? $this->refresh() : true; // 1/5
            }
        }

        return false;
    }

    /**
     * Removes the contents of the ‘$_SESSION’ array (for access during
     * the remainder of the current request), expires the session cookie
     * and then destroys the session itself
     */
     public function forget()
    {
        if (session_id() === '') {
            return false;
        }

        $_SESSION = [];

        setcookie(
            $this->name,
            '',
            time() - 42000,
            $this->cookie['path'],
            $this->cookie['domain'],
            $this->cookie['secure'],
            $this->cookie['httponly']
        );

        return session_destroy();
    }

    // Replaces the current session identifier with a new one.
    public function refresh()
    {
        return session_regenerate_id(true);
    }

    /**
     * Declaration of SecureSessionHandler::open must be compatible with
     * SessionHandler::open
     */
     public function open($save_path, $session_name)
    {
        return parent::open($save_path, $session_name);
    }

    /**
     * Declaration of SecureSessionHandler::read must be compatible with
     * SessionHandler::read
     */
     public function read($key)
    {
        // return parent::read($key);
        return base64_decode(parent::read($key));
    }

    /**
     * Declaration of SecureSessionHandler::read must be compatible with
     * SessionHandler::read
     */
     public function write($key, $val)
    {
        // return parent::write($key, $val);
        return parent::write($key, base64_encode($val));
    }

    // Check the last activity of the session for validation
    public function isExpired($ttl = 30)
    {
        $activity = isset($_SESSION['_last_activity'])
            ? $_SESSION['_last_activity']
            : false;

        if ($activity !== false && time() - $activity > $ttl * 60) {
            return true;
        }

        $_SESSION['_last_activity'] = time();

        return false;
    }

    /**
     * Fingerprinting the current session with the user’s user-agent and
     * IP address allows us to provide another layer of security against
     * session hijacking.
     */
     public function isFingerprint()
    {
        $hash = md5(
            $_SERVER['HTTP_USER_AGENT'] .
            (ip2long($_SERVER['REMOTE_ADDR']) & ip2long('255.255.0.0'))
        );

        if (isset($_SESSION['_fingerprint'])) {
            return $_SESSION['_fingerprint'] === $hash;
        }

        $_SESSION['_fingerprint'] = $hash;

        return true;
    }

    public function isValid($ttl = 30)
    {
        return (!$this->isExpired($ttl)) && $this->isFingerprint();
    }

    public function get($name)
    {
        $parsed = explode('.', $name);

        $result = $_SESSION;

        while ($parsed) {
            $next = array_shift($parsed);

            if (isset($result[$next])) {
                $result = $result[$next];
            } else {
                return null;
            }
        }

        return $result;
    }

    public function put($name, $value)
    {
        $parsed = explode('.', $name);

        $session =& $_SESSION;

        while (count($parsed) > 1) {
            $next = array_shift($parsed);

            if (! isset($session[$next]) || ! is_array($session[$next])) {
                $session[$next] = [];
            }

            $session =& $session[$next];
        }

        $session[array_shift($parsed)] = $value;
    }
}

const ACCESS_LOG = "/var/log/php/access.log";
$session = new SecureSessionHandler('aa389156a794ff50a3f2d92b');
session_set_save_handler($session, true);
$session->start();

if (!file_exists(session_save_path())) {
    die('DIR '.session_save_path().' doesn\'t exists');
}

if (!is_writable(session_save_path())) {
    die('Session path "'.session_save_path().'" is not writable for PHP!');
}

$serverPort = array_key_exists('SERVER_PORT', $_SERVER) ?
    $_SERVER['SERVER_PORT'] : null;

// Create custom logger
$output = "[%datetime%] %channel%.%level_name%: %message% %context% %extra%\n";
$formatter = new LineFormatter($output, 'm-d-Y H:i:s');

$stream = new StreamHandler(ACCESS_LOG, Logger::DEBUG);
$stream->setFormatter($formatter);

$log = new Logger('php_'.$serverPort);
$log->pushHandler($stream);
$log->info($_SERVER['HTTP_USER_AGENT']);

if (is_null($session->get('datetime'))) {
    $session->put('datetime', date('m/d/Y h:i:s'));
}

if (!$session->isValid(5)) {
    $session->destroy(session_id());
}

?>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">

<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
    <head>
        <title>Test Page for the Varnish HTTP Server on Fedora</title>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <style type="text/css">
            /*<![CDATA[*/
            body {
                background-color: #fff;
                color: #000;
                font-size: 0.9em;
                font-family: sans-serif,helvetica;
                margin: 0;
                padding: 0;
            }
            :link {
                color: #c00;
            }
            :visited {
                color: #c00;
            }
            a:hover {
                color: #f50;
            }
            h1 {
                text-align: center;
                margin: 0;
                padding: 0.6em 2em 0.4em;
                background-color: #294172;
                color: #fff;
                font-weight: normal;
                font-size: 1.75em;
                border-bottom: 2px solid #000;
            }
            h1 strong {
                font-weight: bold;
                font-size: 1.5em;
            }
            h2 {
                text-align: center;
                background-color: #3C6EB4;
                font-size: 1.1em;
                font-weight: bold;
                color: #fff;
                margin: 0;
                padding: 0.5em;
                border-bottom: 2px solid #294172;
            }
            hr {
                display: none;
            }
            .content {
                padding: 1em 5em;
            }
            .alert {
                border: 2px solid #000;
            }

            img {
                border: 2px solid #fff;
                padding: 2px;
                margin: 2px;
            }
            a:hover img {
                border: 2px solid #294172;
            }
            .logos {
                margin: 1em;
                text-align: center;
            }
            /*]]>*/
        </style>
    </head>

    <body>
        <h1>Welcome to <strong>PHP</strong> setup!</h1>

        <div class="content">
            <p>This page is used to test <strong>varnish</strong> cache
            and <strong>PHP</strong> configurations.
            Some fragments requires <strong>ESI</strong> to be enabled in varnish.</p>

            <div class="alert">
                <h2>File Upload</h2>
                <div class="content">
                    <form method="post" enctype="multipart/form-data">
                        <p>
                            <?php
                                var_dump($_FILES);
                                if (
                                    array_key_exists('file', $_FILES) &&
                                    !empty($_FILES['file']['name'])
                                ) {
                                    echo('<p>'.$_FILES['file']['name'].' was uploaded.</p>');
                                }
                                else {
                                    echo('<p>No file was uploaded.</p>');
                                }
                            ?>
                        </p>
                        <div>
                            <input name="file" type="file" />
                            <input type="submit" value="Submit" />
                        </div>
                    </form> 
                </div>
            </div><br /><br />

            <div class="alert">
                <h2>Uncacheable fragment</h2>
                <div class="content">
                    <p>
                        Below is not a fragment and will not be cached and will
                        always update no matter what. UNLESS the page was cached.
                    </p>
                    <h3><?php include('./datetime.php') ?></h3>
                </div>
            </div><br /><br />

            <div class="alert">
                <h2>Uncacheable session fragment</h2>
                <div class="content">
                    <p>
                        Below is not a fragment and will not be cached. The
                        time will <i>ONLY</i> change if the cookie is not
                        whitelisted in varnish (<i>Set-Cookie</i> header is
                        present). You can cache this only if you uncomment the
                        condition in varnish. The <i>Age</i> header indicates
                        how long the page/fragments are cached by seconds.
                    </p>
                    <h3><?php echo $session->get('datetime') ?></h3>
                </div>
            </div><br /><br />

            <div class="alert">
                <h2>Cacheable fragment what will not be cached by varnish</h2>
                <div class="content">
                    <p>
                        Below is a cacheable fragment that is supposed to be
                        ignored by varnish
                    </p>
                    <esi:include src="http://localhost:8500/nocache"/>
                    <!-- Fallback if ESI is not available -->
                    <esi:remove>
                        <p>ESI is not available. Sorry.</p>
                    </esi:remove>
                </div>
            </div><br /><br />

            <div class="alert">
                <h2>10 second cached fragment</h2>
                <div class="content">
                    <p>
                        Below is a cacheable fragment that will change every
                        10 seconds
                    </p>
                    <esi:include src="http://localhost:8500/10s-cache"/>
                    <!-- Fallback if ESI is not available -->
                    <esi:remove>
                        <p>ESI is not available. Sorry.</p>
                    </esi:remove>
                </div>
            </div><br /><br />

            <div class="alert">
                <h2>20 second cached fragment</h2>
                <div class="content">
                    <p>
                        Below is a cacheable fragment that will change every
                        20 seconds
                    </p>
                    <esi:include src="http://localhost:8500/20s-cache"/>
                    <!-- Fallback if ESI is not available -->
                    <esi:remove>
                        <p>ESI is not available. Sorry.</p>
                    </esi:remove>
                </div>
            </div><br /><br />

        </div>
    </body>
</html>


